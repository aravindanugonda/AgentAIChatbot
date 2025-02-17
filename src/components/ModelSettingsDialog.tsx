import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Slider,
  Typography,
  Alert,
  Link,
  Snackbar,
} from '@mui/material';
import type { User, ApiSettings } from '../services/TursoService';

interface ModelSettingsDialogProps {
  open: boolean;
  apiSettings: ApiSettings | null;
  currentUser: User | null;
  onClose: () => void;
  onSave: (settings: Partial<Omit<ApiSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => void;
}

export function ModelSettingsDialog({
  open,
  apiSettings,
  currentUser,
  onClose,
  onSave,
}: ModelSettingsDialogProps) {
  const defaultSettings = React.useMemo(() => ({
    api_key: apiSettings?.api_key || '',
    api_url: apiSettings?.api_url || 'https://openrouter.ai/api/v1/chat/completions',
    model: apiSettings?.model || 'deepseek/deepseek-r1-distill-llama-70b:free',
    max_tokens: apiSettings?.max_tokens || 4000,
    temperature: apiSettings?.temperature || 0.7,
  }), [apiSettings]);

  const [tempSettings, setTempSettings] = React.useState(defaultSettings);
  const [error, setError] = React.useState<string>('');
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);

  const validateApiKey = async (apiKey: string) => {
    try {
      setIsValidating(true);
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!tempSettings.api_key) {
      setError('API Key is required');
      return;
    }
    
    try {
      onSave(tempSettings);
      setShowSuccess(true);
    } catch (error) {
      setError('Failed to save settings');
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>API Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">
              Get your free API key from{' '}
              <Link href="https://openrouter.ai/keys" target="_blank" rel="noopener">
                OpenRouter.ai
              </Link>
            </Alert>
            <TextField
              label="OpenRouter API Key"
              value={tempSettings.api_key}
              onChange={(e) => {
                setError('');
                setTempSettings({ ...tempSettings, api_key: e.target.value });
              }}
              type="password"
              required
              helperText="Enter your OpenRouter API key"
              fullWidth
              error={!!error}
            />
            <TextField
              label="API URL"
              value={tempSettings.api_url}
              onChange={(e) => setTempSettings({ ...tempSettings, api_url: e.target.value })}
              helperText="Default: https://openrouter.ai/api/v1/chat/completions"
              placeholder="https://openrouter.ai/api/v1/chat/completions"
              fullWidth
            />
            <TextField
              label="Model"
              value={tempSettings.model}
              onChange={(e) => setTempSettings({ ...tempSettings, model: e.target.value })}
              helperText="Default: deepseek/deepseek-r1-distill-llama-70b:free"
              placeholder="deepseek/deepseek-r1-distill-llama-70b:free"
              fullWidth
            />
            <Stack spacing={1}>
              <Typography gutterBottom>Max Tokens: {tempSettings.max_tokens}</Typography>
              <Slider
                value={tempSettings.max_tokens}
                onChange={(_, value) => setTempSettings({ ...tempSettings, max_tokens: value as number })}
                min={100}
                max={8000}
                step={100}
                valueLabelDisplay="auto"
              />
            </Stack>
            <Stack spacing={1}>
              <Typography gutterBottom>Temperature: {tempSettings.temperature}</Typography>
              <Slider
                value={tempSettings.temperature}
                onChange={(_, value) => setTempSettings({ ...tempSettings, temperature: value as number })}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={isValidating || !tempSettings.api_key}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={showSuccess}
        message="Settings saved successfully"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={1500}
        onClose={() => {
          setShowSuccess(false);
          handleClose();
        }}
      />
    </>
  );
}