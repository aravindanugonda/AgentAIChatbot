import React, { useState } from 'react';
import {
  Container,
  Paper,
  Button,
  Typography,
  Stack,
  Alert,
} from '@mui/material';

interface LoginFormProps {
  onLogin: (apiKey: string) => Promise<void>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!apiKey || isLoading) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await onLogin(apiKey);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Authentication Required</Typography>
        <Stack spacing={2}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            disabled={isLoading}
            placeholder="Enter API Key"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
          <Typography variant="body2" color="text.secondary">
            Contact your administrator to get an API key.
          </Typography>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!apiKey || isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}