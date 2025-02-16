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
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export class TursoService {
  private client;

  constructor(config: DbConfig) {
    this.client = createClient({
      url: config.url,
      authToken: config.authToken,
    });
  }

  async initializeTables() {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_message TEXT
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
      );
    `);
  }

  private rowToChat(row: Row): Chat {
    return {
      id: row.id as string,
      title: row.title as string,
      created_at: row.created_at as string,
      last_message: row.last_message as string | undefined,
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

  async createChat(title: string): Promise<Chat> {
    const chatId = crypto.randomUUID();
    await this.client.execute({
      sql: 'INSERT INTO chats (id, title) VALUES (?, ?)',
      args: [chatId, title]
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

  async getChats(): Promise<Chat[]> {
    const result = await this.client.execute('SELECT * FROM chats ORDER BY created_at DESC');
    return result.rows.map(row => this.rowToChat(row));
  }

  async getChat(chatId: string): Promise<Chat | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM chats WHERE id = ?',
      args: [chatId]
    });
    return result.rows[0] ? this.rowToChat(result.rows[0]) : null;
  }

  async addMessage(chatId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
    const messageId = crypto.randomUUID();
    await this.client.execute({
      sql: 'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
      args: [messageId, chatId, role, content]
    });

    // Update last message in chat
    await this.client.execute({
      sql: 'UPDATE chats SET last_message = ? WHERE id = ?',
      args: [content, chatId]
    });

    const result = await this.client.execute({
      sql: 'SELECT * FROM messages WHERE id = ?',
      args: [messageId]
    });

    return this.rowToMessage(result.rows[0]);
  }

  async getChatMessages(chatId: string): Promise<Message[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
      args: [chatId]
    });
    return result.rows.map(row => this.rowToMessage(row));
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM messages WHERE chat_id = ?',
      args: [chatId]
    });
    await this.client.execute({
      sql: 'DELETE FROM chats WHERE id = ?',
      args: [chatId]
    });
  }
}