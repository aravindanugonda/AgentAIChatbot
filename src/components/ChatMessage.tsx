import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { Person, SmartToy } from '@mui/icons-material';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
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
          }}
        >
          <Typography whiteSpace="pre-wrap">{message.content}</Typography>
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
}