# AgentAI Chatbot

A modern chat interface for interacting with AI models through OpenRouter, featuring persistent chat history using Turso DB and a clean Material-UI interface.

## Features

- 🤖 OpenRouter API integration for access to multiple AI models
- 💾 Persistent chat history using Turso DB
- 🔐 Multi-user support with role-based access control
- 🔑 API key-based authentication
- 👮‍♂️ Admin dashboard for user management
- 🎯 Support for multiple chat sessions
- ⚙️ Configurable settings for:
  - OpenRouter API key and endpoint
  - Model selection
  - Token limits
  - Temperature
  - Database connection

## Prerequisites

Before you begin, ensure you have:
- Node.js v14 or higher
- npm v6 or higher
- A Turso database account (https://turso.tech)
- An OpenRouter API key (https://openrouter.ai/keys)

## Setup Guide

1. Clone the repository:
```bash
git clone https://github.com/yourusername/AgentAIChatbot.git
cd AgentAIChatbot
```

2. Install dependencies:
```bash
npm install
```

3. Set up your Turso database:
   - Create a database at https://turso.tech
   - Note down your database URL and authentication token

4. Start the development server:
```bash
npm start
```

5. Initial Configuration:
   - On first run, you'll be prompted to enter your Turso database URL and auth token
   - An admin account will be automatically created
   - Save the generated admin API key - it will only be shown once!

## Authentication System

The application uses a two-tier authentication system:

1. Database Authentication:
   - Requires Turso database URL and auth token
   - Set up once during initial configuration

2. User Authentication:
   - API key-based system
   - Admin can create and manage user accounts
   - Each user gets a unique API key for access

## User Management

### Admin Users Can:
- Access all settings including database configuration
- Add new users
- Generate and revoke API keys
- Configure OpenRouter API settings
- Manage all chats

### Regular Users Can:
- Configure their OpenRouter API settings
- Create and manage their own chats
- Update their chat preferences

## OpenRouter Integration

1. Get your API key from https://openrouter.ai/keys
2. Configure your API settings in the app:
   - Enter your OpenRouter API key
   - Select your preferred model
   - Adjust token limits and temperature
   - Optional: Customize the API endpoint

## Project Structure

```
chatgpt-client/
├── src/
│   ├── components/          # React components
│   │   ├── AdminDialog     # User management interface
│   │   ├── ChatList       # Chat sidebar component
│   │   ├── ChatMessage    # Message display component
│   │   ├── ModelSettings  # API settings configuration
│   │   └── Settings       # Database settings
│   ├── services/
│   │   └── TursoService   # Database interaction layer
│   └── App.tsx            # Main application component
```

## Security Notes

- API keys are stored securely in the Turso database
- Database credentials should be kept secure
- Admin API key should be saved during initial setup
- User API keys can be regenerated if compromised

## Development

To modify the project:

1. Create a feature branch:
```bash
git checkout -b feature/your-feature
```

2. Make your changes

3. Test thoroughly

4. Create a pull request

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your fork
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenRouter for AI model access
- Turso for database services
- Material-UI for the interface components
