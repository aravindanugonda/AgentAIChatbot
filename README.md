# AgentAI Chatbot

A modern chat interface for interacting with various AI models through different providers (OpenAI, OpenRouter, HuggingFace, etc.) with persistent chat history using Turso DB.

## Features

- 🎯 Multi-provider support (OpenAI, OpenRouter, HuggingFace)
- 💾 Persistent chat history using Turso DB
- 🗂️ Multiple chat sessions support
- ⚙️ Configurable settings for:
  - API endpoints
  - Model selection
  - Token limits
  - Temperature
  - Database connection
- 🎨 Clean, modern Material-UI interface
- 💬 Real-time chat experience
- 🔐 Secure storage of API keys

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/aravindanugonda/AgentAIChatbot.git
cd AgentAIChatbot
```

2. Install dependencies:
```bash
npm install
```

3. Set up Turso DB:
- Visit [Turso](https://turso.tech) and create an account
- Create a new database
- Note down your database URL and authentication token

4. Start the development server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Configuration

On first run, click the settings icon and configure:
1. API Key for your chosen AI provider
2. API URL (defaults to OpenAI)
3. Default model
4. Turso database URL
5. Turso authentication token

## Development

### Project Structure
- `/src` - Source code
  - `/components` - React components
  - `/services` - Service layer (API clients, database)
  - `App.tsx` - Main application component
  - `App.css` - Global styles

### Making Changes

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and test them

3. Commit your changes:
```bash
git add .
git commit -m "Description of your changes"
```

4. Push to GitHub:
```bash
git push origin feature/your-feature-name
```

5. Create a Pull Request on GitHub

## Building for Production

To create a production build:

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to your fork
5. Create a Pull Request

## Technologies Used

- React
- TypeScript
- Material-UI
- Axios
- Turso DB
- LibSQL

## License

This project is licensed under the MIT License - see the LICENSE file for details.
