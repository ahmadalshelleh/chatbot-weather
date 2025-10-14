# Chatbot Backend - Multi-LLM Weather Assistant

A TypeScript/Node.js backend implementation using the Repository Pattern architecture with support for multiple LLM providers (OpenAI, Anthropic, DeepSeek).

## Features

- **Multi-LLM Support**: OpenAI GPT-4, Anthropic Claude 3.5 Sonnet, DeepSeek Chat
- **Tool Calling**: Weather API integration with automatic tool execution
- **Repository Pattern**: Clean separation of concerns (Routes → Controllers → Services → Repositories → Database)
- **MongoDB Integration**: Persistent chat history and evaluation results
- **Swagger/OpenAPI**: Interactive API documentation at `/api-docs`
- **TypeScript**: Fully typed with strict mode enabled

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # MongoDB connection
│   │   └── swagger.ts           # Swagger/OpenAPI configuration
│   ├── models/                  # Mongoose schemas
│   │   ├── chat.model.ts
│   │   └── eval.model.ts
│   ├── repositories/            # Data access layer
│   │   ├── chat.repository.ts
│   │   └── eval.repository.ts
│   ├── services/                # Business logic layer
│   │   ├── chat.service.ts
│   │   ├── tools.service.ts
│   │   └── llm/                 # LLM service implementations
│   │       ├── openai.service.ts
│   │       ├── anthropic.service.ts
│   │       ├── deepseek.service.ts
│   │       └── llm.factory.ts
│   ├── controllers/             # HTTP handlers
│   │   ├── chat.controller.ts
│   │   └── models.controller.ts
│   ├── routes/                  # Route definitions
│   │   ├── chat.routes.ts
│   │   └── models.routes.ts
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── middleware/
│   │   └── errorHandler.ts
│   └── server.ts                # Express app entry point
├── .env                         # Environment variables
├── package.json
└── tsconfig.json
```

## Setup Instructions

### 1. Install Dependencies

All dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Environment Variables

Update the `.env` file with your API keys:

```bash
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...

# External APIs
OPENWEATHER_API_KEY=...

# MongoDB (use local or MongoDB Atlas)
MONGODB_URI=mongodb://localhost:27017/chatbot
```

### 3. Start MongoDB

**Option A: Local MongoDB**
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: MongoDB Atlas** (Cloud)
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a cluster and get connection string
- Update `MONGODB_URI` in `.env`

### 4. Run the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

## API Endpoints

### Interactive Documentation

Once running, visit:
- **Swagger UI**: http://localhost:5000/api-docs
- **OpenAPI Spec**: http://localhost:5000/api-docs.json

### Available Endpoints

**Chat**
- `POST /api/chat` - Send a message to the chatbot
- `GET /api/chat/history/:sessionId` - Get chat history

**Models**
- `GET /api/models` - List available LLM providers

**Health**
- `GET /health` - Health check

## Testing the API

### Using cURL

```bash
# Test health endpoint
curl http://localhost:5000/health

# Get available models
curl http://localhost:5000/api/models

# Send a chat message
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather in Paris?"}],
    "model": "openai"
  }'

# Get chat history
curl http://localhost:5000/api/chat/history/session-123
```

### Using Swagger UI

1. Navigate to http://localhost:5000/api-docs
2. Click on any endpoint to expand
3. Click "Try it out"
4. Modify the request body/parameters
5. Click "Execute" to test

## Architecture Flow

```
HTTP Request
    ↓
Routes (routing only)
    ↓
Controllers (validation, HTTP handling)
    ↓
Services (business logic)
    ↓
Repositories (data access)
    ↓
Database (MongoDB)
```

## Repository Pattern Benefits

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Easy to mock repositories and services
3. **Reusability**: Repository methods can be used by multiple services
4. **Maintainability**: Changes to database queries only affect repositories
5. **Clean Code**: Clear organization and navigation

## Tool Calling

The chatbot supports automatic tool execution with these weather tools:

- `get_current_weather(location, unit)` - Get current weather
- `get_forecast(location)` - Get 5-day forecast

The agent loop automatically:
1. Detects when LLM wants to call a tool
2. Executes the tool with provided arguments
3. Returns results to LLM
4. Continues conversation until no more tool calls

## Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Compile TypeScript to JavaScript
npm start          # Run production server
npm run type-check # Check TypeScript types without building
```

## Next Steps

1. **Add API Keys**: Update `.env` with your actual API keys
2. **Start MongoDB**: Ensure MongoDB is running (local or Atlas)
3. **Test API**: Use Swagger UI or cURL to test endpoints
4. **Frontend**: Continue with the React frontend implementation
5. **Deployment**: Follow deployment guide for AWS EC2 or other platforms

## Troubleshooting

**MongoDB Connection Failed**
- Ensure MongoDB is running: `brew services list` (macOS)
- Check connection string in `.env`
- For MongoDB Atlas, ensure your IP is whitelisted

**Type Errors**
```bash
npm run type-check
```

**Port Already in Use**
- Change `PORT` in `.env` to another port (e.g., 5001)
- Or kill the process using port 5000

**Missing API Keys**
- Verify all required keys are set in `.env`
- Make sure there are no quotes around the keys in `.env`

## Additional Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [DeepSeek API Docs](https://platform.deepseek.com/)
- [MongoDB Docs](https://www.mongodb.com/docs/)
- [Express.js Docs](https://expressjs.com/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
