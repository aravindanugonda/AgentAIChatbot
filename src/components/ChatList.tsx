import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import type { Chat } from '../services/TursoService';

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatList({ chats, selectedChatId, onChatSelect, onNewChat, onDeleteChat }: ChatListProps) {
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRight: 1,
      borderColor: 'divider',
      bgcolor: 'white',
    }}>
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<Add />}
          onClick={onNewChat}
        >
          New Chat
        </Button>
      </Box>
      
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {chats.map((chat) => (
          <ListItem
            key={chat.id}
            disablePadding
            secondaryAction={
              <IconButton 
                edge="end" 
                onClick={() => onDeleteChat(chat.id)}
                sx={{ opacity: 0, transition: 'opacity 0.2s', '.MuiListItem-root:hover &': { opacity: 1 } }}
              >
                <Delete />
              </IconButton>
            }
          >
            <ListItemButton 
              selected={selectedChatId === chat.id}
              onClick={() => onChatSelect(chat.id)}
            >
              <ListItemText 
                primary={chat.title} 
                secondary={chat.last_message}
                primaryTypographyProps={{
                  noWrap: true,
                  sx: { fontWeight: selectedChatId === chat.id ? 'bold' : 'normal' }
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  sx: { opacity: 0.7 }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        {chats.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No chats yet</Typography>
          </Box>
        )}
      </List>
    </Box>
  );
}