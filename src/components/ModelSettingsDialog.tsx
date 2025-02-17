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
  const defaultSettings = {
    api_key: '',
    api_url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-r1-distill-llama-70b:free',
    max_tokens: 4000,
    temperature: 0.7,
  };

  const [tempSettings, setTempSettings] = React.useState<typeof defaultSettings>(
    apiSettings ? {
      api_key: apiSettings.api_key,
      api_url: apiSettings.api_url,
      model: apiSettings.model,
      max_tokens: apiSettings.max_tokens,
      temperature: apiSettings.temperature,
    } : defaultSettings
  );

  const [error, setError] = React.useState<string>('');
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Update tempSettings when apiSettings changes
  React.useEffect(() => {
    if (apiSettings) {
      setTempSettings({
        api_key: apiSettings.api_key,
        api_url: apiSettings.api_url,
        model: apiSettings.model,
        max_tokens: apiSettings.max_tokens,
        temperature: apiSettings.temperature,
      });
    } else {
      setTempSettings(defaultSettings);
    }
  }, [apiSettings]);

  const handleSave = () => {
    if (!tempSettings.api_key) {
      setError('API Key is required');
      return;
    }
    setError('');
    onSave(tempSettings);
    setShowSuccess(true);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
              onChange={(e) => setTempSettings({ ...tempSettings, api_key: e.target.value })}
              type="password"
              required
              helperText="Enter your OpenRouter API key"
              fullWidth
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
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={showSuccess}
        message="Settings saved successfully"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={1500}
        onClose={() => {
          setShowSuccess(false);
          onClose();
        }}
      />
    </>
  );
}