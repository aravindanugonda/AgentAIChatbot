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
} from '@mui/material';
import { Settings } from '@mui/icons-material';
import axios from 'axios';
import './App.css';
import { SettingsDialog } from './components/SettingsDialog';
import { ChatMessage } from './components/ChatMessage';
import { ChatList } from './components/ChatList';
import { TursoService, type Chat, type Message } from './services/TursoService';

interface ApiConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  tursoUrl: string;
  tursoAuthToken?: string;
}

function App() {
  const [config, setConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('apiConfig');
    return saved ? JSON.parse(saved) : {
      apiKey: '',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      maxTokens: 4000,
      temperature: 0.7,
      tursoUrl: 'libsql://aichatbot-aravindanugonda.turso.io',
      tursoAuthToken: '',
    };
  });

  const [db, setDb] = useState<TursoService | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Initialize database connection
  useEffect(() => {
    if (config.tursoUrl) {
      const dbInstance = new TursoService({
        url: config.tursoUrl,
        authToken: config.tursoAuthToken,
      });
      setDb(dbInstance);
      dbInstance.initializeTables().catch(console.error);
    }
  }, [config.tursoUrl, config.tursoAuthToken]);

  // Load chats
  useEffect(() => {
    if (db) {
      db.getChats().then(setChats).catch(console.error);
    }
  }, [db]);

  // Load messages for selected chat
  useEffect(() => {
    if (db && selectedChatId) {
      db.getChatMessages(selectedChatId).then(setMessages).catch(console.error);
    } else {
      setMessages([]);
    }
  }, [db, selectedChatId]);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(config));
  }, [config]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading || !db || !selectedChatId) return;

    setLoading(true);
    try {
      const userMessage = await db.addMessage(selectedChatId, 'user', newMessage);
      setMessages(prev => [...prev, userMessage]);
      setNewMessage('');

      const result = await axios.post(
        config.apiUrl,
        {
          model: config.model,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const assistantMessage = await db.addMessage(
        selectedChatId,
        'assistant',
        result.data.choices[0].message.content
      );
      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh chats to update last message
      const updatedChats = await db.getChats();
      setChats(updatedChats);
    } catch (error) {
      const errorMessage = await db.addMessage(
        selectedChatId,
        'assistant',
        'Error: ' + (error as any).message
      );
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!db) return;
    
    try {
      const chat = await db.createChat(newChatTitle || 'New Chat');
      setChats(prev => [chat, ...prev]);
      setSelectedChatId(chat.id);
      setNewChatDialogOpen(false);
      setNewChatTitle('');
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!db) return;
    
    try {
      await db.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(undefined);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleSaveSettings = (newConfig: ApiConfig) => {
    setConfig(newConfig);
  };

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
              <IconButton onClick={() => setSettingsOpen(true)} title="Settings">
                <Settings />
              </IconButton>
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
                    disabled={loading || !config.apiKey || !selectedChatId}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !config.apiKey || !selectedChatId || !newMessage.trim()}
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </Stack>
              </form>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <SettingsDialog
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
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
    </Container>
  );
}

export default App;
