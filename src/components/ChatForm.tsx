import React, { memo } from 'react';
import { Stack, TextField, Button } from '@mui/material';
import { styled } from '@mui/material/styles';

const StableTextField = styled(TextField)({
  '& .MuiInputBase-root': {
    transition: 'none'
  }
});

interface ChatFormProps {
  onSubmit: (message: string) => Promise<void>;
  disabled: boolean;
}

const ChatForm = memo(({ onSubmit, disabled }: ChatFormProps) => {
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    const currentMessage = message.trim();
    setMessage('');

    try {
      await onSubmit(currentMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack direction="row" spacing={1}>
        <StableTextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={disabled ? "Select a chat to start messaging" : "Type a message..."}
          fullWidth
          multiline
          maxRows={4}
          disabled={isSubmitting || disabled}
          sx={{ 
            '& .MuiInputBase-root': {
              backgroundColor: 'background.paper'
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || disabled || !message.trim()}
          sx={{
            minWidth: '80px',
            backgroundColor: theme => isSubmitting ? theme.palette.grey[500] : undefined,
            pointerEvents: isSubmitting ? 'none' : undefined
          }}
        >
          Send
        </Button>
      </Stack>
    </form>
  );
});

ChatForm.displayName = 'ChatForm';

export { ChatForm };