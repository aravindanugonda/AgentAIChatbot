import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tooltip,
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
import { LoginForm } from './components/LoginForm';
import { ChatForm } from './components/ChatForm';

interface ApiConfig {
  tursoUrl: string;
  tursoAuthToken?: string;
  userApiKey?: string;
  reinitializeTables?: boolean;
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
      reinitializeTables: false,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('You are a helpful AI assistant');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  // Only scroll when new messages are added
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > prevMessagesLengthRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Initial scroll on chat change
  useEffect(() => {
    if (selectedChatId && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [selectedChatId]);

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
      reinitializeTables: config.reinitializeTables
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
            tursoAuthToken: config.tursoAuthToken,
            reinitializeTables: false // Reset the flag after initialization
          }));
          alert(`Admin account created!\n\nEmail: admin@example.com\nAPI Key: ${apiKey}\n\nPlease save this API key - it won't be shown again.`);
          window.location.reload();
          return;
        }

        localStorage.setItem('apiConfig', JSON.stringify({
          tursoUrl: config.tursoUrl,
          tursoAuthToken: config.tursoAuthToken,
          reinitializeTables: false // Reset the flag after initialization
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
  }, [config.tursoUrl, config.tursoAuthToken, config.reinitializeTables]);

  // User validation
  useEffect(() => {
    if (!db || !config.userApiKey) {
      setCurrentUser(null);
      return;
    }

    const validateUser = async () => {
      try {
        if (typeof config.userApiKey === 'string') {
          const user = await db.validateApiKey(config.userApiKey);
          if (user) setCurrentUser(user);
        }
      } catch (error) {
        console.error('User validation error:', error);
        setCurrentUser(null);
      }
    };

    validateUser();
  }, [db, config.userApiKey]);

  // API settings and messages loading - combine settings and messages loading
  useEffect(() => {
    if (!db || !currentUser || !selectedChatId) return;

    const loadData = async () => {
      try {
        const chatMessages = await db.getChatMessages(selectedChatId, currentUser.id);
        if (chatMessages) {
          setMessages(chatMessages);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, [db, currentUser, selectedChatId]);

  // Separate effect for API settings to avoid circular dependency
  useEffect(() => {
    if (!db || !currentUser) return;

    const loadApiSettings = async () => {
      try {
        const settings = await db.getApiSettings(currentUser.id);
        if (settings) {
          setApiSettings(settings);
        }
      } catch (error) {
        console.error('Failed to load API settings:', error);
      }
    };

    loadApiSettings();
  }, [db, currentUser]);

  // Load chats
  useEffect(() => {
    if (!db || !currentUser) {
      setChats([]);
      return;
    }

    const loadData = async () => {
      try {
        // Batch the data loading
        const [fetchedChats, settings] = await Promise.all([
          db.getChats(currentUser.id),
          db.getApiSettings(currentUser.id)
        ]);
        
        // Batch state updates
        React.startTransition(() => {
          setChats(fetchedChats);
          if (settings) {
            setApiSettings(settings);
          }
        });
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, [db, currentUser]);

  // Handle settings init with single loading state
  useEffect(() => {
    if (!db || !currentUser || !apiSettings) return;

    const loadSettings = async () => {
      try {
        const settings = await db.getApiSettings(currentUser.id);
        if (settings) {
          setApiSettings(settings);
        }
      } catch (error) {
        console.error('Failed to load API settings:', error);
      }
    };

    loadSettings();
  }, [db, currentUser, apiSettings]);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(config));
  }, [config]);

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
      
      // Update local state directly instead of triggering a reload
      setApiSettings(settings);
      setModelSettingsOpen(false);
    } catch (error) {
      console.error('Failed to update API settings:', error);
      alert('Failed to save API settings. Please try again.');
    }
  };

  const handleLogin = async (apiKey: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');
    
    const user = await db.validateApiKey(apiKey);
    if (!user) {
      throw new Error('Invalid API key. Please check and try again.');
    }
    
    // Update localStorage first
    localStorage.setItem('apiConfig', JSON.stringify({ ...config, userApiKey: apiKey }));
    
    // Then update state
    setConfig(prev => ({ ...prev, userApiKey: apiKey }));
    setCurrentUser(user);
  };

  const handleMessageSubmit = async (messageText: string) => {
    if (!db || !selectedChatId || !currentUser || !apiSettings) return;
    
    try {
      // Create a unique ID for this message
      const tempMessageId = 'temp-' + Date.now();
      setCurrentMessageId(tempMessageId);
      
      const userMessage = {
        id: tempMessageId,
        chat_id: selectedChatId,
        role: 'user' as const,
        content: messageText,
        created_at: new Date().toISOString()
      };

      // Add user message immediately
      setMessages(prev => [...prev, userMessage]);

      const chat = chats.find(c => c.id === selectedChatId);
      if (!chat) throw new Error('Chat not found');

      // Save user message and get API response
      const [savedUserMessage, apiResponse] = await Promise.all([
        db.addMessage(selectedChatId, 'user', messageText, currentUser.id),
        axios.post(
          apiSettings.api_url,
          {
            model: apiSettings.model,
            messages: [
              { role: 'system', content: chat.system_prompt },
              ...messages,
              { role: 'user', content: messageText }
            ].map(m => ({
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
        )
      ]);

      // Add assistant message
      const assistantMessage = await db.addMessage(
        selectedChatId,
        'assistant',
        apiResponse.data.choices[0].message.content,
        currentUser.id
      );

      // Update messages and clear loading state
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessageId ? savedUserMessage : msg)
          .concat(assistantMessage)
      );
      setCurrentMessageId(null);

      setChats(prev => prev.map(c => 
        c.id === selectedChatId 
          ? { ...c, last_message: assistantMessage.content }
          : c
      ));

      // Scroll to bottom after new message
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        chat_id: selectedChatId,
        role: 'assistant',
        content: 'Error: ' + (error instanceof Error ? error.message : 'Something went wrong'),
        created_at: new Date().toISOString()
      }]);
      setCurrentMessageId(null);
    }
  };

  const handleNewChat = async () => {
    if (!db || !currentUser) return;
    
    try {
      // Create chat first
      const chat = await db.createChat(
        newChatTitle || 'New Chat',
        currentUser.id,
        newSystemPrompt
      );

      // Reset form values
      const resetForm = () => {
        setNewChatTitle('');
        setNewSystemPrompt('You are a helpful AI assistant');
        setNewChatDialogOpen(false);
      };

      // Update state in a specific order
      setSelectedChatId(chat.id);
      setChats(prev => [chat, ...prev]);
      setMessages([]);
      resetForm();
    } catch (error) {
      console.error('Failed to create new chat:', error);
      alert('Failed to create new chat. Please try again.');
    }
  };

  const handleLogout = () => {
    setConfig(prev => ({ ...prev, userApiKey: undefined }));
    setCurrentUser(null);
    localStorage.removeItem('apiConfig');
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

  // Update the loadUsers function with useCallback
  const loadUsers = useCallback(async () => {
    if (!db || !currentUser?.is_admin) return;
    try {
      const userList = await db.listUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [db, currentUser?.is_admin]);

  // Update AdminDialog open handler
  useEffect(() => {
    if (adminDialogOpen && currentUser?.is_admin) {
      loadUsers();
    }
  }, [adminDialogOpen, currentUser, db, loadUsers]);

  // Check for authentication
  if (!isDbReady) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Initializing...</Typography>
          <Typography variant="body1">Please wait while we set up your environment.</Typography>
        </Paper>
      </Container>
    );
  }

  if (!currentUser && !config.userApiKey && db) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Render database connection error if present - this should be checked first
  if ((dbConnectionError || (!config.tursoUrl || !config.tursoAuthToken)) && !currentUser?.is_admin) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Database Settings Required</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please configure your database connection settings to continue.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setSettingsOpen(true)}
          >
            Configure Database Settings
          </Button>
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
        </Paper>
      </Container>
    );
  }

  // Then check for API settings after database is confirmed working
  if (currentUser && apiSettings && !apiSettings.api_key) {
    return (
      <ModelSettingsDialog
        open={true}
        apiSettings={apiSettings}
        currentUser={currentUser}
        onClose={() => setModelSettingsOpen(false)} // Allow closing if user wants to configure later
        onSave={handleSaveSettings}
      />
    );
  }

  // Then check for database and user auth
  if (!db || !currentUser) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Loading...</Typography>
          <Typography variant="body1">Please wait.</Typography>
        </Paper>
      </Container>
    );
  }

  // Show API settings configuration screen if needed
  if (currentUser && apiSettings && !apiSettings.api_key) {
    return (
      <ModelSettingsDialog
        open={true}
        apiSettings={apiSettings}
        currentUser={currentUser}
        onClose={() => {}} // Empty onClose to prevent closing
        onSave={handleSaveSettings}
      />
    );
  }

  // Remove isApiSettingsReady check since we handle it above
  // Remove loading states that aren't necessary
  if (!db || !currentUser) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Loading...</Typography>
          <Typography variant="body1">Please wait.</Typography>
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
              flexDirection: 'column',
            }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 0.5
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
              {selectedChatId && (
                <Tooltip 
                  title={chats.find(c => c.id === selectedChatId)?.system_prompt || ''} 
                  arrow
                  placement="bottom-start"
                >
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontStyle: 'italic',
                      display: 'block',
                      maxWidth: '80%',
                      cursor: 'help',
                      borderLeft: '2px solid',
                      borderColor: 'primary.light',
                      pl: 1,
                      mt: 0.5,
                      opacity: 0.8,
                      '&:hover': {
                        opacity: 1
                      }
                    }}
                  >
                    🤖 System: {chats.find(c => c.id === selectedChatId)?.system_prompt}
                  </Typography>
                </Tooltip>
              )}
            </Box>

            <Box 
              ref={messagesContainerRef}
              sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                p: 2,
                bgcolor: 'white',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {messages.map((message, index) => (
                <ChatMessage 
                  key={message.id || index} 
                  message={message} 
                  isLoading={currentMessageId === message.id}
                />
              ))}
              <div ref={messagesEndRef} style={{ float:"left", clear: "both" }} />
            </Box>

            <Box 
              sx={{ 
                p: 2, 
                borderTop: 1, 
                borderColor: 'divider',
              }}
            >
              <ChatForm
                onSubmit={handleMessageSubmit}
                disabled={!apiSettings?.api_key || !selectedChatId}
              />
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
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Chat Title"
              fullWidth
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder="Enter chat title"
            />
            <TextField
              margin="dense"
              label="System Prompt"
              fullWidth
              multiline
              rows={3}
              value={newSystemPrompt}
              onChange={(e) => setNewSystemPrompt(e.target.value)}
              placeholder="Enter system prompt"
              helperText="This prompt will guide the AI's behavior throughout the conversation"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNewChatDialogOpen(false);
            setNewSystemPrompt('You are a helpful AI assistant');
            setNewChatTitle('');
          }}>Cancel</Button>
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
