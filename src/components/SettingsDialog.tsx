import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import type { User } from '../services/TursoService';

interface ApiConfig {
  tursoUrl: string;
  tursoAuthToken?: string;
  userApiKey?: string;
}

interface SettingsDialogProps {
  open: boolean;
  config: ApiConfig;
  currentUser: User | null;
  onClose: () => void;
  onSave: (config: ApiConfig) => void;
  onOpenAdmin?: () => void;
}

export function SettingsDialog({ 
  open, 
  config, 
  currentUser,
  onClose, 
  onSave,
  onOpenAdmin 
}: SettingsDialogProps) {
  const [tempConfig, setTempConfig] = React.useState(config);

  // Reset temp config when dialog opens with new config
  React.useEffect(() => {
    setTempConfig(config);
  }, [config, open]);

  const handleSave = () => {
    // Ensure we preserve any existing userApiKey
    onSave({
      ...config,
      tursoUrl: tempConfig.tursoUrl,
      tursoAuthToken: tempConfig.tursoAuthToken,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Database Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="h6" gutterBottom>Turso Database Connection</Typography>
          {currentUser?.is_admin ? (
            <>
              <TextField
                label="Turso Database URL"
                value={tempConfig.tursoUrl}
                onChange={(e) => setTempConfig({ ...tempConfig, tursoUrl: e.target.value })}
                placeholder="libsql://your-database-url"
                helperText="The URL of your Turso database"
                fullWidth
                required
              />
              <TextField
                label="Turso Auth Token"
                value={tempConfig.tursoAuthToken || ''}
                onChange={(e) => setTempConfig({ ...tempConfig, tursoAuthToken: e.target.value })}
                type="password"
                helperText="Your Turso authentication token"
                fullWidth
                required
              />
            </>
          ) : (
            <Typography color="text.secondary">
              Only administrators can modify database settings.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1} sx={{ width: '100%', px: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          {currentUser?.is_admin && onOpenAdmin && (
            <Button 
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              color="secondary"
            >
              Manage Users
            </Button>
          )}
          {currentUser?.is_admin && (
            <Button 
              onClick={handleSave} 
              variant="contained"
              disabled={!tempConfig.tursoUrl || !tempConfig.tursoAuthToken}
            >
              Save
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}