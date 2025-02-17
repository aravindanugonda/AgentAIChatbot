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
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import type { User } from '../services/TursoService';

interface ApiConfig {
  tursoUrl: string;
  tursoAuthToken?: string;
  userApiKey?: string;
  reinitializeTables?: boolean;
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
  const [error, setError] = React.useState('');
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Reset temp config when dialog opens with new config
  React.useEffect(() => {
    setTempConfig(config);
    setError('');
  }, [config, open]);

  const handleSave = async () => {
    if (!tempConfig.tursoUrl || !tempConfig.tursoAuthToken) {
      setError('Both Database URL and Auth Token are required');
      return;
    }

    // Save configuration without validation
    onSave(tempConfig);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Database Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="h6" gutterBottom>Turso Database Connection</Typography>
          {(!config.tursoUrl || !config.tursoAuthToken || currentUser?.is_admin) ? (
            <>
              <TextField
                label="Turso Database URL"
                value={tempConfig.tursoUrl}
                onChange={(e) => {
                  setError('');
                  setTempConfig({ ...tempConfig, tursoUrl: e.target.value });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                placeholder="libsql://your-database-url"
                helperText="The URL of your Turso database"
                fullWidth
                required
                error={!!error && error.includes('URL')}
              />
              <TextField
                label="Turso Auth Token"
                value={tempConfig.tursoAuthToken || ''}
                onChange={(e) => {
                  setError('');
                  setTempConfig({ ...tempConfig, tursoAuthToken: e.target.value });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                type="password"
                helperText="Your Turso authentication token"
                fullWidth
                required
                error={!!error && error.includes('Token')}
              />
              {isDevelopment && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    Development Options
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!tempConfig.reinitializeTables}
                        onChange={(e) => setTempConfig({ ...tempConfig, reinitializeTables: e.target.checked })}
                        color="warning"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">Reinitialize Tables</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Warning: This will drop and recreate all tables
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              )}
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
          {(!config.tursoUrl || !config.tursoAuthToken || currentUser?.is_admin) && (
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