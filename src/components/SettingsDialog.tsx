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
} from '@mui/material';

interface ApiConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface SettingsDialogProps {
  open: boolean;
  config: ApiConfig;
  onClose: () => void;
  onSave: (config: ApiConfig) => void;
}

export function SettingsDialog({ open, config, onClose, onSave }: SettingsDialogProps) {
  const [tempConfig, setTempConfig] = React.useState(config);

  const handleSave = () => {
    onSave(tempConfig);
    onClose();
  };

  React.useEffect(() => {
    setTempConfig(config);
  }, [config]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="API Key"
            value={tempConfig.apiKey}
            onChange={(e) => setTempConfig({ ...tempConfig, apiKey: e.target.value })}
            type="password"
            fullWidth
          />
          <TextField
            label="API URL"
            value={tempConfig.apiUrl}
            onChange={(e) => setTempConfig({ ...tempConfig, apiUrl: e.target.value })}
            fullWidth
          />
          <TextField
            label="Default Model"
            value={tempConfig.model}
            onChange={(e) => setTempConfig({ ...tempConfig, model: e.target.value })}
            placeholder="e.g., gpt-3.5-turbo, anthropic/claude-2"
            helperText="Enter any model ID from OpenAI, OpenRouter, or HuggingFace"
            fullWidth
          />
          <Stack spacing={1}>
            <Typography gutterBottom>Max Tokens: {tempConfig.maxTokens}</Typography>
            <Slider
              value={tempConfig.maxTokens}
              onChange={(_, value) => setTempConfig({ ...tempConfig, maxTokens: value as number })}
              min={100}
              max={8000}
              step={100}
              valueLabelDisplay="auto"
            />
          </Stack>
          <Stack spacing={1}>
            <Typography gutterBottom>Temperature: {tempConfig.temperature}</Typography>
            <Slider
              value={tempConfig.temperature}
              onChange={(_, value) => setTempConfig({ ...tempConfig, temperature: value as number })}
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
  );
}