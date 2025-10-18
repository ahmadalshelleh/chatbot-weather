# Intelligent Weather Chatbot Platform

A conversational AI system that provides weather information through natural language interactions, powered by multiple LLM providers with intelligent routing.

---

## What It Does

Ask weather questions in plain language and get instant, accurate answers:
- "What's the weather like today?"
- "Should I bring an umbrella tomorrow?"
- "Is it good weather for a picnic this weekend?"

The system understands context, remembers your conversations, and provides personalized responses.

---

## Key Features

**Intelligent Multi-Model Architecture**
- GPT-4o-mini router analyzes each query
- Automatically selects best model (GPT-3.5 Turbo or DeepSeek)
- Fallback mechanism ensures reliability

**Conversational AI**
- Natural language understanding
- Context-aware responses
- Session-based memory across conversations

**Real-Time Weather Integration**
- Live weather data via OpenWeather API
- Location-based forecasts
- Activity recommendations

**Production-Ready**
- RESTful API with Swagger documentation
- MongoDB persistence
- Streaming support for real-time responses
- Comprehensive evaluation framework

---

## Architecture

**Backend Stack**
- Node.js + Express + TypeScript
- MongoDB for data persistence
- Qdrant vector database for memory

**AI Models**
- GPT-3.5 Turbo (conversational queries)
- DeepSeek V3 (weather & data analysis)
- GPT-4o-mini (intelligent routing)

**APIs & Services**
- OpenWeather API for weather data
- RESTful endpoints
- Server-Sent Events (SSE) for streaming

---

## Project Structure

```
chatbot-project/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── orchestrator/ # Routing and coordination
│   │   ├── services/     # LLM and tool services
│   │   ├── models/       # Database models
│   │   ├── routes/       # API endpoints
│   │   └── eval/         # Testing and evaluation
│   └── .env              # Configuration
└── docs/                 # Documentation
```

---

## API Endpoints

**Chat**
- `POST /api/chat` - Send a message and get response
- `POST /api/chat/stream` - Stream responses in real-time

**Models**
- `GET /api/models` - List available AI models

**Health**
- `GET /health` - System health check

**Documentation**
- `GET /api-docs` - Interactive API documentation (Swagger UI)

---

## How It Works

1. **User sends a message** via REST API
2. **GPT-4o-mini router** analyzes the query
3. **Best model selected** (GPT-3.5 or DeepSeek)
4. **Model processes request** with tool calling if needed
5. **Weather API called** when weather data required
6. **Response returned** with model metadata
7. **Conversation saved** to MongoDB for context

---

## Evaluation & Testing

Built-in evaluation framework measures:
- Model accuracy and routing decisions
- Tool calling reliability
- Response latency
- Hallucination detection
- Pass/fail rates by category

Test suite includes:
- Unit tests for each component
- Integration tests for end-to-end flows
- Model comparison benchmarks

---

## Documentation

- `BUSINESS.md` - Business overview and value proposition
- `TECHNICAL.md` - Technical architecture and request lifecycle
- `04-llm-comparison.md` - LLM model comparison and analysis
- `/api-docs` - Interactive API documentation

---

## Environment

**Development**
- Local server: `http://localhost:3001`
- API docs: `http://localhost:3001/api-docs`

**Production**
- Server: `http://63.180.58.146`

---

## Future Enhancements

- Claude integration (API key configured)
- Voice interface support
- Multi-language support
- Advanced weather visualizations
- Mobile app integration
