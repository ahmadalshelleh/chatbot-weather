export type ModelProvider = 'openai' | 'anthropic' | 'deepseek';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  model: ModelProvider;
}

export interface ChatResponse {
  response: string;
  toolCallsMade: ToolCall[];
  modelUsed: ModelProvider;
}

export interface Model {
  id: ModelProvider;
  name: string;
  provider: string;
}
