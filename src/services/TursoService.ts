import { createClient, type Row } from '@libsql/client';

interface DbConfig {
  url: string;
  authToken?: string;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  last_message?: string;
  user_id: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key: string;
  created_at: string;
}

export interface ApiSettings {
  id: string;
  api_key: string;
  api_url: string;
  model: string;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export class TursoService {
  private client;

  constructor(config: DbConfig) {
    this.client = createClient({
      url: config.url,
      authToken: config.authToken,
    });
  }

  async checkAdminUser(): Promise<{ exists: boolean; apiKey?: string }> {
    try {
      const adminUser = await this.getUserByEmail('admin@example.com');
      if (!adminUser) {
        return { exists: false };
      }

      // Check if admin has an API key
      const result = await this.client.execute({
        sql: 'SELECT key FROM api_keys WHERE user_id = ? LIMIT 1',
        args: [adminUser.id]
      });

      return {
        exists: true,
        apiKey: result.rows[0]?.key as string | undefined
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async initializeTables() {
    // First check if tables exist
    try {
      const tableCheck = await this.client.execute({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'api_keys', 'api_settings')`,
        args: []
      });
      
      const existingTables = new Set(tableCheck.rows.map(row => row.name));

      // Create tables if they don't exist
      if (!existingTables.has('users')) {
        await this.client.execute({
          sql: `
            CREATE TABLE users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              is_admin BOOLEAN DEFAULT FALSE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `,
          args: []
        });
      }

      if (!existingTables.has('api_keys')) {
        await this.client.execute({
          sql: `
            CREATE TABLE api_keys (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              key TEXT UNIQUE NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE(user_id)
            )
          `,
          args: []
        });
      }

      if (!existingTables.has('api_settings')) {
        await this.client.execute({
          sql: `
            CREATE TABLE api_settings (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              openrouter_key TEXT NOT NULL DEFAULT '',
              api_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1/chat/completions',
              model TEXT NOT NULL DEFAULT 'deepseek/deepseek-r1-distill-llama-70b:free',
              max_tokens INTEGER NOT NULL DEFAULT 4000,
              temperature REAL NOT NULL DEFAULT 0.7,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE(user_id)
            )
          `,
          args: []
        });
      }

      // Drop and recreate api_settings if it has old structure
      const columnCheck = await this.client.execute({
        sql: "PRAGMA table_info(api_settings)",
        args: []
      });
      
      const hasOldStructure = columnCheck.rows.some(row => row.name === 'api_key');
      if (hasOldStructure) {
        // Drop the table first
        await this.client.execute({
          sql: `DROP TABLE api_settings`,
          args: []
        });
        
        // Then recreate it
        await this.client.execute({
          sql: `
            CREATE TABLE api_settings (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              openrouter_key TEXT NOT NULL DEFAULT '',
              api_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1/chat/completions',
              model TEXT NOT NULL DEFAULT 'deepseek/deepseek-r1-distill-llama-70b:free',
              max_tokens INTEGER NOT NULL DEFAULT 4000,
              temperature REAL NOT NULL DEFAULT 0.7,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE(user_id)
            )
          `,
          args: []
        });
      }

      // Create chats table
      await this.client.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_message TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `,
        args: []
      });

      // Create messages table
      await this.client.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
          )
        `,
        args: []
      });

      // Add missing constraints
      await this.client.execute({
        sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_api_settings_user_id ON api_settings(user_id)`,
        args: []
      });

    } catch (error) {
      console.error('Error initializing tables:', error);
      throw error;
    }
  }

  private rowToChat(row: Row): Chat {
    return {
      id: row.id as string,
      title: row.title as string,
      created_at: row.created_at as string,
      last_message: row.last_message as string | undefined,
      user_id: row.user_id as string,
    };
  }

  private rowToMessage(row: Row): Message {
    return {
      id: row.id as string,
      chat_id: row.chat_id as string,
      role: row.role as 'user' | 'assistant',
      content: row.content as string,
      created_at: row.created_at as string,
    };
  }

  private rowToUser(row: Row): User {
    return {
      id: row.id as string,
      email: row.email as string,
      is_admin: Boolean(row.is_admin), // Fix boolean conversion
      created_at: row.created_at as string,
    };
  }

  private rowToApiSettings(row: Row): ApiSettings {
    return {
      id: row.id as string,
      api_key: row.openrouter_key as string,  // Map openrouter_key to api_key for interface compatibility
      api_url: row.api_url as string,
      model: row.model as string,
      max_tokens: row.max_tokens as number,
      temperature: row.temperature as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  async createChat(title: string, userId: string): Promise<Chat> {
    const chatId = crypto.randomUUID();
    await this.client.execute({
      sql: 'INSERT INTO chats (id, title, user_id) VALUES (?, ?, ?)',
      args: [chatId, title, userId]
    });

    const result = await this.client.execute({
      sql: 'SELECT * FROM chats WHERE id = ?',
      args: [chatId]
    });

    return this.rowToChat(result.rows[0]);
  }

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    await this.client.execute({
      sql: 'UPDATE chats SET title = ? WHERE id = ?',
      args: [title, chatId]
    });
  }

  async getChats(userId: string): Promise<Chat[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId]
    });
    return result.rows.map(row => this.rowToChat(row));
  }

  async getChat(chatId: string, userId: string): Promise<Chat | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM chats WHERE id = ? AND user_id = ?',
      args: [chatId, userId]
    });
    return result.rows[0] ? this.rowToChat(result.rows[0]) : null;
  }

  async addMessage(chatId: string, role: 'user' | 'assistant', content: string, userId: string): Promise<Message> {
    // First verify the chat belongs to the user
    const chat = await this.getChat(chatId, userId);
    if (!chat) {
      throw new Error('Chat not found or access denied');
    }

    const messageId = crypto.randomUUID();
    await this.client.execute({
      sql: 'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
      args: [messageId, chatId, role, content]
    });

    // Update last message in chat
    await this.client.execute({
      sql: 'UPDATE chats SET last_message = ? WHERE id = ? AND user_id = ?',
      args: [content, chatId, userId]
    });

    const result = await this.client.execute({
      sql: 'SELECT * FROM messages WHERE id = ?',
      args: [messageId]
    });

    return this.rowToMessage(result.rows[0]);
  }

  async getChatMessages(chatId: string, userId: string): Promise<Message[]> {
    // First verify the chat belongs to the user
    const chat = await this.getChat(chatId, userId);
    if (!chat) return [];

    const result = await this.client.execute({
      sql: 'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
      args: [chatId]
    });
    return result.rows.map(row => this.rowToMessage(row));
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    // First verify the chat belongs to the user
    const chat = await this.getChat(chatId, userId);
    if (!chat) return;

    await this.client.execute({
      sql: 'DELETE FROM messages WHERE chat_id = ?',
      args: [chatId]
    });
    await this.client.execute({
      sql: 'DELETE FROM chats WHERE id = ? AND user_id = ?',
      args: [chatId, userId]
    });
  }

  async createUser(email: string, isAdmin: boolean = false): Promise<{ user: User; apiKey: string }> {
    // First check if user already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      // User exists, check if they have an API key
      const keyResult = await this.client.execute({
        sql: 'SELECT key FROM api_keys WHERE user_id = ? LIMIT 1',
        args: [existingUser.id]
      });

      if (keyResult.rows[0]) {
        return {
          user: existingUser,
          apiKey: keyResult.rows[0].key as string
        };
      }

      // No API key exists, create one and return
      const apiKey = crypto.randomUUID();
      const keyId = crypto.randomUUID();
      await this.client.execute({
        sql: 'INSERT INTO api_keys (id, user_id, key) VALUES (?, ?, ?)',
        args: [keyId, existingUser.id, apiKey]
      });

      // Ensure user has default API settings
      await this.client.execute({
        sql: `
          INSERT INTO api_settings (id, user_id) 
          VALUES (?, ?) 
          ON CONFLICT(user_id) DO NOTHING
        `,
        args: [existingUser.id, existingUser.id]
      });

      return {
        user: existingUser,
        apiKey
      };
    }

    // Create new user
    const userId = crypto.randomUUID();
    
    // 1. Create the user
    await this.client.execute({
      sql: 'INSERT INTO users (id, email, is_admin) VALUES (?, ?, ?)',
      args: [userId, email, isAdmin]
    });

    // 2. Create default API settings
    await this.client.execute({
      sql: `
        INSERT INTO api_settings (id, user_id) 
        VALUES (?, ?)
      `,
      args: [userId, userId]
    });

    // 3. Create API key
    const apiKey = crypto.randomUUID();
    const keyId = crypto.randomUUID();
    await this.client.execute({
      sql: 'INSERT INTO api_keys (id, user_id, key) VALUES (?, ?, ?)',
      args: [keyId, userId, apiKey]
    });

    // 4. Get the created user
    const userResult = await this.client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId]
    });

    return {
      user: this.rowToUser(userResult.rows[0]),
      apiKey
    };
  }

  async generateApiKey(userId: string): Promise<string> {
    // First check if user exists
    const userResult = await this.client.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [userId]
    });

    if (!userResult.rows[0]) {
      throw new Error('User not found');
    }

    // Delete any existing API keys for this user
    await this.client.execute({
      sql: 'DELETE FROM api_keys WHERE user_id = ?',
      args: [userId]
    });
    
    // Generate new API key
    const keyId = crypto.randomUUID();
    const apiKey = crypto.randomUUID();
    
    await this.client.execute({
      sql: 'INSERT INTO api_keys (id, user_id, key) VALUES (?, ?, ?)',
      args: [keyId, userId, apiKey]
    });

    return apiKey;
  }

  async validateApiKey(apiKey: string): Promise<User | null> {
    // Using a more direct query to ensure we get the correct user with their admin status
    const result = await this.client.execute({
      sql: `
        SELECT DISTINCT u.* 
        FROM users u
        INNER JOIN api_keys ak ON ak.user_id = u.id
        WHERE ak.key = ?
      `,
      args: [apiKey]
    });

    return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
  }

  async listUsers(): Promise<User[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM users ORDER BY created_at DESC',
      args: []
    });
    return result.rows.map(row => this.rowToUser(row));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
  }

  async revokeApiKey(apiKey: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM api_keys WHERE key = ?',
      args: [apiKey]
    });
  }

  async getApiSettings(userId: string): Promise<ApiSettings | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM api_settings WHERE user_id = ? LIMIT 1',
      args: [userId]
    });
    return result.rows[0] ? this.rowToApiSettings(result.rows[0]) : null;
  }

  async updateApiSettings(userId: string, settings: Omit<ApiSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiSettings> {
    try {
      // First check if settings exist for this user
      const existingSettings = await this.client.execute({
        sql: 'SELECT * FROM api_settings WHERE user_id = ?',
        args: [userId]
      });

      if (existingSettings.rows.length === 0) {
        // If no settings exist, create new settings
        const result = await this.client.execute({
          sql: `
            INSERT INTO api_settings (
              id, user_id, openrouter_key, api_url, model, max_tokens, temperature, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            RETURNING *
          `,
          args: [
            userId,
            userId,
            settings.api_key,
            settings.api_url,
            settings.model,
            settings.max_tokens,
            settings.temperature
          ]
        });

        return {
          ...this.rowToApiSettings(result.rows[0]),
          api_key: result.rows[0].openrouter_key as string
        };
      }

      // Update existing settings
      const result = await this.client.execute({
        sql: `
          UPDATE api_settings 
          SET 
            openrouter_key = ?,
            api_url = ?,
            model = ?,
            max_tokens = ?,
            temperature = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
          RETURNING *
        `,
        args: [
          settings.api_key,
          settings.api_url,
          settings.model,
          settings.max_tokens,
          settings.temperature,
          userId
        ]
      });

      return {
        ...this.rowToApiSettings(result.rows[0]),
        api_key: result.rows[0].openrouter_key as string
      };
    } catch (error) {
      console.error('Error updating API settings:', error);
      throw error;
    }
  }

  async resetAdminApiKey(): Promise<string | null> {
    try {
      const adminUser = await this.getUserByEmail('admin@example.com');
      if (!adminUser || !adminUser.is_admin) {
        return null;
      }

      // Generate new API key for admin
      const apiKey = await this.generateApiKey(adminUser.id);

      // Ensure admin has API settings
      await this.client.execute({
        sql: `
          INSERT INTO api_settings (
            id, user_id, api_key, api_url, model, max_tokens, temperature
          ) VALUES (?, ?, '', 'https://openrouter.ai/api/v1/chat/completions',
            'deepseek/deepseek-r1-distill-llama-70b:free', 4000, 0.7
          )
          ON CONFLICT(user_id) DO NOTHING
        `,
        args: [adminUser.id, adminUser.id]
      });

      return apiKey;
    } catch (error) {
      console.error('Failed to reset admin API key:', error);
      return null;
    }
  }

  async getApiKeyForUser(userId: string): Promise<string | null> {
    const result = await this.client.execute({
      sql: 'SELECT key FROM api_keys WHERE user_id = ? LIMIT 1',
      args: [userId]
    });
    return result.rows[0]?.key as string || null;
  }

  async getAllApiKeys(): Promise<Record<string, string>> {
    const result = await this.client.execute({
      sql: 'SELECT user_id, key FROM api_keys',
      args: []
    });
    
    return result.rows.reduce((acc, row) => {
      acc[row.user_id as string] = row.key as string;
      return acc;
    }, {} as Record<string, string>);
  }
}