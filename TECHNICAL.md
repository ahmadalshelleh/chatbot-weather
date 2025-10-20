# Technical Architecture

## Chat Request Lifecycle

### Overview
The system processes chat requests through a multi-stage pipeline involving routing, model execution, tool calling, and persistence.

---

### Request Flow

```
User Request → Router → Model Selection → Execution → Tool Calls → Response → Persistence
```

---

### Detailed Lifecycle

#### 1. **Request Reception**
- User sends message via REST API (`POST /api/chat`)
- Request includes: message content, session ID
- Validation checks ensure proper format

#### 2. **Session Management**
- Load conversation history from MongoDB using session ID
- Append new user message to session
- Maintain conversation context (last 5 messages used for routing)

#### 3. **Intelligent Routing**
- Router analyzes user query and conversation history
- Selects optimal LLM provider (OpenAI or DeepSeek)
- Determines fallback model if primary fails
- Returns routing decision with confidence score and reasoning

#### 4. **Model Execution**
- Create LLM service instance for selected model
- Initialize conversation with full message history
- Enter agent loop (max 5 iterations by default)

#### 5. **Agent Loop (Tool Calling)**
For each iteration:
- **LLM Call**: Send messages to model with available tools
- **Response Analysis**: Check if model wants to call tools
  - **No tools**: Final response ready → go to step 6
  - **Has tools**: Execute each tool call
- **Tool Execution**: Call external services (e.g., weather API)
- **Tool Results**: Append results back to conversation
- **Continue**: Loop back for next iteration

#### 6. **Fallback Handling**
- If primary model fails, automatically switch to fallback model
- Re-execute entire process with fallback
- Track fallback usage in response metadata

#### 7. **Response Preparation**
- Extract final assistant message
- Collect all tool calls made during conversation
- Include model metadata (which model used, fallback status, routing reasoning)

#### 8. **Persistence**
- Save assistant response to session in MongoDB
- Store chat analytics in separate collection
- Track: model used, tools called, latency, timestamp

#### 9. **Response Delivery**
Return to user:
```json
{
  "response": "Final answer text",
  "toolCallsMade": [...],
  "modelUsed": "openai",
  "modelDisplayName": "GPT-4",
  "fallbackUsed": false,
  "routingReasoning": "Complex query requires advanced reasoning"
}
```

---

### Key Components

**Orchestrator Service**
- Coordinates entire request lifecycle
- Manages routing, execution, and fallback logic

**Router Service**
- Analyzes queries to select appropriate model
- Uses heuristics based on query complexity and type

**LLM Factory**
- Creates provider-specific LLM service instances
- Abstracts provider differences (OpenAI, DeepSeek)

**Tool Service**
- Executes external API calls (weather, etc.)
- Returns structured data to LLM

**Session Repository**
- Manages conversation persistence
- Loads/saves message history

**Chat Repository**
- Stores analytics and metrics
- Tracks model performance data

---

### Error Handling

- **Model Failure**: Automatic fallback to secondary model
- **Tool Errors**: Graceful degradation with error messages returned to LLM
- **Max Iterations**: Safety limit prevents infinite loops
- **Validation Errors**: Clear error responses to client

---

### Performance Features

- **Session-based Memory**: Conversations persist across requests
- **Selective History**: Only recent messages sent to model (reduces tokens)
- **Parallel Tool Calls**: Multiple tools executed concurrently when possible
- **Streaming Support**: Real-time response streaming available via SSE
