import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Typography,
  Box,
  Stack,
  Alert,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { TursoService, type User } from '../services/TursoService';

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  users: User[];
  onAddUser: (email: string) => Promise<void>;
  onGenerateApiKey: (userId: string) => Promise<string>;
  onRevokeApiKey: (apiKey: string) => Promise<void>;
}

export function AdminDialog({ 
  open, 
  onClose, 
  users, 
  onAddUser,
  onGenerateApiKey,
  onRevokeApiKey 
}: AdminDialogProps) {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [userApiKeys, setUserApiKeys] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch existing API keys when dialog opens
  useEffect(() => {
    if (open) {
      const fetchApiKeys = async () => {
        try {
          setLoading(true);
          setError('');
          const db = new TursoService({
            url: localStorage.getItem('apiConfig') ? JSON.parse(localStorage.getItem('apiConfig')!).tursoUrl : '',
            authToken: localStorage.getItem('apiConfig') ? JSON.parse(localStorage.getItem('apiConfig')!).tursoAuthToken : ''
          });
          const keys = await db.getAllApiKeys();
          setUserApiKeys(keys);
        } catch (err) {
          setError('Failed to load API keys');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchApiKeys();
    }
  }, [open]);

  const handleAddUser = async () => {
    if (!newUserEmail) {
      setError('Email is required');
      return;
    }
    try {
      await onAddUser(newUserEmail);
      setNewUserEmail('');
      setError('');
    } catch (err) {
      setError('Failed to add user. Email might already exist.');
    }
  };

  const handleGenerateKey = async (userId: string) => {
    try {
      const key = await onGenerateApiKey(userId);
      setUserApiKeys(prev => ({ ...prev, [userId]: key }));
      setError('');
    } catch (err) {
      setError('Failed to generate API key');
    }
  };

  const handleRevokeKey = async (userId: string, apiKey: string) => {
    try {
      await onRevokeApiKey(apiKey);
      setUserApiKeys(prev => {
        const newKeys = { ...prev };
        delete newKeys[userId];
        return newKeys;
      });
      setError('');
    } catch (err) {
      setError('Failed to revoke API key');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>User Management</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Box>
            <Typography variant="h6" gutterBottom>Add New User</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter email"
                fullWidth
                error={!!error && error.includes('email')}
              />
              <Button
                variant="contained"
                onClick={handleAddUser}
                startIcon={<Add />}
              >
                Add
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>Existing Users</Typography>
            <List>
              {users.map((user) => (
                <ListItem
                  key={user.id}
                  divider
                  secondaryAction={
                    userApiKeys[user.id] ? (
                      <Stack direction="row" spacing={1}>
                        {!user.is_admin && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleRevokeKey(user.id, userApiKeys[user.id])}
                          >
                            Revoke Key
                          </Button>
                        )}
                      </Stack>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleGenerateKey(user.id)}
                      >
                        Generate Key
                      </Button>
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography>{user.email}</Typography>
                        {user.is_admin && (
                          <Typography variant="caption" color="primary">(Admin)</Typography>
                        )}
                      </Stack>
                    }
                    secondary={userApiKeys[user.id] ? (
                      <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                        API Key: {userApiKeys[user.id]}
                      </Typography>
                    ) : loading ? 'Loading...' : 'No API key'}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}