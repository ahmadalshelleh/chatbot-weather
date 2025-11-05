import { Annotation } from '@langchain/langgraph';
import { ModelProvider, Message } from '../types';

/**
 * State schema for the LangGraph conversation flow
 * This defines the data that flows through the graph
 */
export const GraphState = Annotation.Root({
  // Conversation messages
  messages: Annotation<Message[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => []
  }),

  // Current user message being processed
  userMessage: Annotation<string>({
    reducer: (_, update) => update,
    default: () => ''
  }),

  // Session ID for database operations
  sessionId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => ''
  }),

  // Selected model after routing
  selectedModel: Annotation<ModelProvider | null>({
    reducer: (_, update) => update,
    default: () => null
  }),

  // Routing decision info
  routingReasoning: Annotation<string>({
    reducer: (_, update) => update,
    default: () => ''
  }),

  // Routing confidence
  routingConfidence: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0
  }),

  // Fallback model if primary fails
  fallbackModel: Annotation<ModelProvider | null>({
    reducer: (_, update) => update,
    default: () => null
  }),

  // Final response from model
  finalResponse: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null
  }),

  // Tool calls made during execution
  toolCallsMade: Annotation<any[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => []
  }),

  // Whether fallback was used
  fallbackUsed: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false
  }),

  // Error tracking
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null
  }),

  // Current iteration count for tool calling
  iterationCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0
  }),

  // Maximum iterations allowed
  maxIterations: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 5
  })
});

export type GraphStateType = typeof GraphState.State;
