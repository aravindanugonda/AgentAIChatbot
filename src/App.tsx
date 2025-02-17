import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Stack,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { Settings, Logout } from '@mui/icons-material';
import axios from 'axios';
import './App.css';
import { SettingsDialog } from './components/SettingsDialog';
import { ModelSettingsDialog } from './components/ModelSettingsDialog';
import { ChatMessage } from './components/ChatMessage';
import { ChatList } from './components/ChatList';
import { AdminDialog } from './components/AdminDialog';
import { TursoService, type Chat, type Message, type User, type ApiSettings } from './services/TursoService';

interface ApiConfig {
  tursoUrl: string;
  tursoAuthToken?: string;
  userApiKey?: string;
}

function App() {
  const [dbConnectionError, setDbConnectionError] = useState<string | null>(null);
  
  // Update config initialization to not load userApiKey initially
  const [config, setConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('apiConfig');
    const defaultConfig = {
      tursoUrl: process.env.REACT_APP_TURSO_DB_URL || '',
      tursoAuthToken: process.env.REACT_APP_TURSO_AUTH_TOKEN || '',
      userApiKey: undefined,
    };
    
    // If environment variables are set, use them
    if (defaultConfig.tursoUrl && defaultConfig.tursoAuthToken) {
      return defaultConfig;
    }
    
    // Otherwise fall back to localStorage
    if (!saved) return defaultConfig;
    
    const parsed = JSON.parse(saved);
    return {
      ...defaultConfig,
      tursoUrl: parsed.tursoUrl || defaultConfig.tursoUrl,
      tursoAuthToken: parsed.tursoAuthToken || defaultConfig.tursoAuthToken,
    };
  });

  const [apiSettings, setApiSettings] = useState<ApiSettings | null>(null);
  const [db, setDb] = useState<TursoService | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isUserReady, setIsUserReady] = useState(false);
  const [isApiSettingsReady, setIsApiSettingsReady] = useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Database initialization
  useEffect(() => {
    if (!config.tursoUrl || !config.tursoAuthToken) {
      setDb(null);
      setIsDbReady(true);
      return;
    }

    const dbInstance = new TursoService({
      url: config.tursoUrl,
      authToken: config.tursoAuthToken,
    });
    
    const initializeDb = async () => {
      try {
        await dbInstance.initializeTables();
        setDb(dbInstance);
        
        const users = await dbInstance.listUsers();
        
        if (users.length === 0) {
          const { apiKey } = await dbInstance.createUser('admin@example.com', true);
          localStorage.setItem('apiConfig', JSON.stringify({
            tursoUrl: config.tursoUrl,
            tursoAuthToken: config.tursoAuthToken
          }));
          alert(`Admin account created!\n\nEmail: admin@example.com\nAPI Key: ${apiKey}\n\nPlease save this API key - it won't be shown again.`);
          window.location.reload();
          return;
        }

        localStorage.setItem('apiConfig', JSON.stringify({
          tursoUrl: config.tursoUrl,
          tursoAuthToken: config.tursoAuthToken
        }));
        
        setIsDbReady(true);
      } catch (error) {
        console.error('Database initialization error:', error);
        setDbConnectionError(error instanceof Error ? error.message : 'Failed to initialize database');
        setDb(null);
        setIsDbReady(true);
      }
    };

    initializeDb();
    return () => {
      setDb(null);
      setIsDbReady(false);
    };
  }, [config.tursoUrl, config.tursoAuthToken]);

  // User validation
  useEffect(() => {
    if (!db || !config.userApiKey) {
      setCurrentUser(null);
      setIsUserReady(true);
      return;
    }

    const validateUser = async () => {
      try {
        // Add type guard to ensure userApiKey is string
        if (typeof config.userApiKey === 'string') {
          const user = await db.validateApiKey(config.userApiKey);
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('User validation error:', error);
        setCurrentUser(null);
      } finally {
        setIsUserReady(true);
      }
    };

    validateUser();
  }, [db, config.userApiKey]);

  // API settings loading
  useEffect(() => {
    let mounted = true;

    if (!db || !currentUser) {
      setApiSettings(null);
      setIsApiSettingsReady(true);
      return;
    }

    const loadSettings = async () => {
      try {
        const settings = await db.getApiSettings(currentUser.id);
        if (!mounted) return;

        if (settings) {
          setApiSettings(settings);
        } else {
          const defaultSettings = await db.updateApiSettings(currentUser.id, {
            api_key: '',
            api_url: 'https://openrouter.ai/api/v1/chat/completions',
            model: 'deepseek/deepseek-r1-distill-llama-70b:free',
            max_tokens: 4000,
            temperature: 0.7,
          });
          if (!mounted) return;
          setApiSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Failed to load API settings:', error);
        if (mounted) {
          setApiSettings(null);
        }
      } finally {
        if (mounted) {
          setIsApiSettingsReady(true);
        }
      }
    };

    setIsApiSettingsReady(false);
    loadSettings();
    return () => { mounted = false; };
  }, [db, currentUser]);

  // Load users list for admin
  useEffect(() => {
    if (!db || !currentUser?.is_admin) {
      setUsers([]);
      return;
    }
    db.listUsers().then(setUsers).catch(console.error);
  }, [db, currentUser]);

  // Load chats
  useEffect(() => {
    if (!db || !currentUser) {
      setChats([]);
      return;
    }
    db.getChats(currentUser.id).then(setChats).catch(console.error);
  }, [db, currentUser]);

  // Load messages
  useEffect(() => {
    if (!db || !selectedChatId || !currentUser) {
      setMessages([]);
      return;
    }
    db.getChatMessages(selectedChatId, currentUser.id).then(setMessages).catch(console.error);
  }, [db, selectedChatId, currentUser]);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(config));
  }, [config]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Define handleSaveSettings before it's used in JSX
  const handleSaveSettings = async (newSettings: Partial<ApiSettings>) => {
    if (!db || !currentUser) return;

    try {
      // Save API settings
      const settings = await db.updateApiSettings(currentUser.id, {
        api_key: newSettings.api_key || '',
        api_url: newSettings.api_url || 'https://openrouter.ai/api/v1/chat/completions',
        model: newSettings.model || 'deepseek/deepseek-r1-distill-llama-70b:free',
        max_tokens: newSettings.max_tokens || 4000,
        temperature: newSettings.temperature || 0.7,
      });
      
      // Update local state
      setApiSettings(settings);
      setModelSettingsOpen(false);
    } catch (error) {
      console.error('Failed to update API settings:', error);
      alert('Failed to save API settings. Please try again.');
    }
  };

  // First check if we have database settings
  if (!config.tursoUrl || !config.tursoAuthToken) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Initial Setup Required</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Welcome to the chat application! Please configure your Turso database settings to get started.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Turso Database URL"
              value={config.tursoUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, tursoUrl: e.target.value }))}
              placeholder="libsql://your-database-url"
              helperText="The URL of your Turso database"
              fullWidth
              required
            />
            <TextField
              label="Turso Auth Token"
              value={config.tursoAuthToken || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, tursoAuthToken: e.target.value }))}
              type="password"
              helperText="Your Turso authentication token"
              fullWidth
              required
            />
            <Alert severity="info">
              This is a one-time setup. After saving, an admin account will be created automatically.
            </Alert>
            <Button
              variant="contained"
              onClick={() => {
                localStorage.setItem('apiConfig', JSON.stringify(config));
                window.location.reload();
              }}
              disabled={!config.tursoUrl || !config.tursoAuthToken}
            >
              Save Database Settings
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Check for authentication
  if (!currentUser && !config.userApiKey && db) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Authentication Required</Typography>
          <Stack spacing={2}>
            <TextField
              label="API Key"
              fullWidth
              type="password"
              onChange={(e) => setConfig(prev => ({ ...prev, userApiKey: e.target.value }))}
            />
            <Typography variant="body2" color="text.secondary">
              Contact your administrator to get an API key.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => {
                localStorage.setItem('apiConfig', JSON.stringify(config));
                window.location.reload();
              }}
              disabled={!config.userApiKey}
            >
              Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Check for database initialization
  if (!db) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Initializing Database...</Typography>
          <Typography variant="body1">
            Please wait while we set up your database.
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Only show loading settings after we have confirmed db and user
  if (!isDbReady || !isUserReady) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Initializing...</Typography>
          <Typography variant="body1">
            Please wait while we set up your environment.
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (currentUser && !isApiSettingsReady) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Loading Settings...</Typography>
          <Typography variant="body1">Please wait while we load your settings.</Typography>
        </Paper>
      </Container>
    );
  }

  // Show API settings configuration screen if needed
  if (currentUser && apiSettings && !apiSettings.api_key) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>API Settings Required</Typography>
          <Stack spacing={2}>
            <Typography variant="body1">
              Please configure your OpenRouter API settings to start using the chat interface.
            </Typography>
            <Alert severity="info">
              You'll need to set up your API key and preferences before you can start chatting.
            </Alert>
            <Button
              variant="contained"
              onClick={() => setModelSettingsOpen(true)}
            >
              Configure API Settings
            </Button>
          </Stack>
          <ModelSettingsDialog
            open={modelSettingsOpen}
            apiSettings={apiSettings}
            currentUser={currentUser}
            onClose={() => setModelSettingsOpen(false)}
            onSave={handleSaveSettings}
          />
        </Paper>
      </Container>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading || !db || !selectedChatId || !currentUser || !apiSettings) return;

    setLoading(true);
    try {
      const userMessage = await db.addMessage(selectedChatId, 'user', newMessage, currentUser.id);
      setMessages(prev => [...prev, userMessage]);
      setNewMessage('');

      const result = await axios.post(
        apiSettings.api_url,
        {
          model: apiSettings.model,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: apiSettings.max_tokens,
          temperature: apiSettings.temperature,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiSettings.api_key}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const assistantMessage = await db.addMessage(
        selectedChatId,
        'assistant',
        result.data.choices[0].message.content,
        currentUser.id
      );
      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh chats to update last message
      const updatedChats = await db.getChats(currentUser.id);
      setChats(updatedChats);
    } catch (error) {
      const errorMessage = await db.addMessage(
        selectedChatId,
        'assistant',
        'Error: ' + (error as any).message,
        currentUser.id
      );
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Update handleNewChat to include user_id
  const handleNewChat = async () => {
    if (!db || !currentUser) return;
    
    try {
      const chat = await db.createChat(newChatTitle || 'New Chat', currentUser.id);
      setChats(prev => [chat, ...prev]);
      setSelectedChatId(chat.id);
      setNewChatDialogOpen(false);
      setNewChatTitle('');
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!db || !currentUser) return;
    
    try {
      await db.deleteChat(chatId, currentUser.id);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(undefined);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleAddUser = async (email: string) => {
    if (!db || !currentUser?.is_admin) return;
    const { user } = await db.createUser(email);
    setUsers(prev => [...prev, user]);
  };

  const handleGenerateApiKey = async (userId: string) => {
    if (!db || !currentUser?.is_admin) return '';
    return await db.generateApiKey(userId);
  };

  const handleRevokeApiKey = async (apiKey: string) => {
    if (!db || !currentUser?.is_admin) return;
    await db.revokeApiKey(apiKey);
  };

  const handleLogout = () => {
    setConfig(prev => ({ ...prev, userApiKey: undefined }));
    setCurrentUser(null);
    localStorage.removeItem('apiConfig');
  };

  // Render database connection error if present
  if (dbConnectionError && currentUser?.is_admin) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Database Connection Error</Typography>
          <Typography color="error" gutterBottom>{dbConnectionError}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please check your database connection settings.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setSettingsOpen(true)}
          >
            Configure Database Settings
          </Button>
          {settingsOpen && (
            <SettingsDialog
              open={settingsOpen}
              config={config}
              currentUser={currentUser}
              onClose={() => setSettingsOpen(false)}
              onSave={(newConfig) => {
                setConfig(newConfig);
                localStorage.setItem('apiConfig', JSON.stringify(newConfig));
              }}
              onOpenAdmin={() => setAdminDialogOpen(true)}
            />
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ height: '100vh', py: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid item xs={3} sx={{ height: '100%' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <ChatList
              chats={chats}
              selectedChatId={selectedChatId}
              onChatSelect={setSelectedChatId}
              onNewChat={() => setNewChatDialogOpen(true)}
              onDeleteChat={handleDeleteChat}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={9} sx={{ height: '100%' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: 'white',
            }}
          >
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Typography variant="h6">
                {selectedChatId ? (chats.find(c => c.id === selectedChatId)?.title || 'Chat') : 'Select a chat'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setModelSettingsOpen(true)}
                  sx={{ mr: 1 }}
                >
                  Configure API Settings
                </Button>
                {currentUser?.is_admin && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setAdminDialogOpen(true)}
                    sx={{ mr: 1 }}
                  >
                    Manage Users
                  </Button>
                )}
                <IconButton onClick={() => setSettingsOpen(true)} title="Database Settings">
                  <Settings />
                </IconButton>
                <IconButton onClick={handleLogout} title="Logout">
                  <Logout />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              p: 2,
              bgcolor: 'white',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {messages.map((message, index) => (
                <ChatMessage key={message.id || index} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <form onSubmit={handleSubmit}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={selectedChatId ? "Type a message..." : "Select a chat to start messaging"}
                    fullWidth
                    multiline
                    maxRows={4}
                    disabled={loading || !apiSettings?.api_key || !selectedChatId}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !apiSettings?.api_key || !selectedChatId || !newMessage.trim()}
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </Stack>
              </form>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <ModelSettingsDialog
        open={modelSettingsOpen}
        apiSettings={apiSettings}
        currentUser={currentUser}
        onClose={() => setModelSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <SettingsDialog
        open={settingsOpen}
        config={config}
        currentUser={currentUser}
        onClose={() => setSettingsOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
          localStorage.setItem('apiConfig', JSON.stringify(newConfig));
        }}
        onOpenAdmin={() => setAdminDialogOpen(true)}
      />

      <Dialog open={newChatDialogOpen} onClose={() => setNewChatDialogOpen(false)}>
        <DialogTitle>New Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chat Title"
            fullWidth
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            placeholder="Enter chat title"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChatDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNewChat} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      <AdminDialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        users={users}
        onAddUser={handleAddUser}
        onGenerateApiKey={handleGenerateApiKey}
        onRevokeApiKey={handleRevokeApiKey}
      />
    </Container>
  );
}

export default App;
