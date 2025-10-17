export type ModelProvider = 'openai' | 'deepseek';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  modelDisplayName?: string;
  fallbackUsed?: boolean;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ChatRequest {
  message: string; // Now single message string
}

export interface ChatResponse {
  response: string;
  toolCallsMade: ToolCall[];
  modelUsed: ModelProvider;
  modelDisplayName?: string;
  fallbackUsed?: boolean;
  routingReasoning?: string;
}

export interface Model {
  id: ModelProvider;
  name: string;
  provider: string;
}
