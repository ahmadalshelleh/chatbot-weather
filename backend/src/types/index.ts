export type ModelProvider = 'openai' | 'anthropic' | 'deepseek';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ChatRequest {
  messages: Message[];
  model: ModelProvider;
  maxIterations?: number;
}

export interface ChatResponse {
  response: string;
  toolCallsMade: ToolCall[];
  modelUsed: ModelProvider;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}
