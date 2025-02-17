import React, { memo } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Person, SmartToy } from '@mui/icons-material';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

const ChatMessage = memo(({ message, isLoading }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          maxWidth: '70%',
          gap: 1,
          flexDirection: isUser ? 'row' : 'row-reverse',
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            bgcolor: isUser ? 'primary.main' : 'white',
            border: theme => isUser ? 'none' : `1px solid ${theme.palette.grey[300]}`,
            color: isUser ? 'white' : 'text.primary',
            borderRadius: 2,
            minWidth: '100px',
            position: 'relative',
          }}
        >
          <Typography
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.2s ease-in-out',
            }}
          >
            {message.content}
          </Typography>
          {isLoading && (
            <CircularProgress
              size={16}
              sx={{
                position: 'absolute',
                right: 8,
                bottom: 8,
              }}
            />
          )}
        </Paper>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            color: isUser ? 'primary.main' : 'grey.500',
          }}
        >
          {isUser ? <Person /> : <SmartToy />}
        </Box>
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content &&
         prevProps.isLoading === nextProps.isLoading;
});

ChatMessage.displayName = 'ChatMessage';

export { ChatMessage };