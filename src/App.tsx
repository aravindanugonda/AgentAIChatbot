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
} from '@mui/material';
import { Settings, Delete } from '@mui/icons-material';
import axios from 'axios';
import './App.css';
import { SettingsDialog } from './components/SettingsDialog';
import { ChatMessage } from './components/ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
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
    };
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;
    
    const userMessage = { role: 'user' as const, content: newMessage };
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);
    
    try {
      const result = await axios.post(
        config.apiUrl,
        {
          model: config.model,
          messages: [...messages, userMessage],
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
      
      const assistantMessage = {
        role: 'assistant' as const,
        content: result.data.choices[0].message.content,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: ' + (error as any).message,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = (newConfig: ApiConfig) => {
    setConfig(newConfig);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 2 }}>
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
          bgcolor: 'white',
        }}>
          <Typography variant="h6">Chat Interface</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={handleClearChat} color="error" title="Clear chat">
              <Delete />
            </IconButton>
            <IconButton onClick={() => setSettingsOpen(true)} title="Settings">
              <Settings />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2,
          bgcolor: 'white',
        }}>
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
          <form onSubmit={handleSubmit}>
            <Stack direction="row" spacing={1}>
              <TextField
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                fullWidth
                multiline
                maxRows={4}
                disabled={loading || !config.apiKey}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !config.apiKey || !newMessage.trim()}
              >
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </Stack>
          </form>
        </Box>
      </Paper>

      <SettingsDialog
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </Container>
  );
}

export default App;
