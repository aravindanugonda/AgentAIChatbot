import React, { memo } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import type { Chat } from '../services/TursoService';

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

const ChatListItem = memo(({ 
  chat, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  chat: Chat; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete: () => void;
}) => (
  <ListItem
    button
    selected={isSelected}
    onClick={onSelect}
    sx={{
      borderRadius: 1,
      mb: 0.5,
      '&.Mui-selected': {
        backgroundColor: 'primary.light',
        color: 'white',
        '&:hover': {
          backgroundColor: 'primary.main',
        },
      },
    }}
  >
    <ListItemText
      primary={chat.title}
      secondary={
        <Typography
          variant="body2"
          sx={{
            color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {chat.last_message || 'No messages yet'}
        </Typography>
      }
    />
    <ListItemSecondaryAction>
      <Tooltip title="Delete chat">
        <IconButton
          edge="end"
          onClick={onDelete}
          sx={{
            color: isSelected ? 'white' : 'inherit',
            '&:hover': {
              backgroundColor: isSelected ? 'primary.dark' : undefined,
            },
          }}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </ListItemSecondaryAction>
  </ListItem>
));

ChatListItem.displayName = 'ChatListItem';

const ChatList = memo(({ 
  chats, 
  selectedChatId, 
  onChatSelect, 
  onNewChat, 
  onDeleteChat 
}: ChatListProps) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<AddIcon />}
          onClick={onNewChat}
        >
          New Chat
        </Button>
      </Box>
      <List sx={{ 
        flex: 1, 
        overflowY: 'auto',
        p: 2,
        '& .MuiListItem-root': {
          transition: 'background-color 0.2s ease',
        }
      }}>
        {chats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isSelected={chat.id === selectedChatId}
            onSelect={() => onChatSelect(chat.id)}
            onDelete={() => onDeleteChat(chat.id)}
          />
        ))}
        {chats.length === 0 && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              textAlign: 'center', 
              mt: 2,
              fontStyle: 'italic'
            }}
          >
            No chats yet. Create a new one to get started!
          </Typography>
        )}
      </List>
    </Box>
  );
});

ChatList.displayName = 'ChatList';

export { ChatList };