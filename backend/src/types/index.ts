export type ModelProvider = 'openai' | 'deepseek';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
  timestamp?: Date;
  modelUsed?: ModelProvider;
  modelDisplayName?: string;
  fallbackUsed?: boolean;
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
  message: string; // Now accepts single message string instead of array
  maxIterations?: number;
}

export interface ChatResponse {
  response: string;
  toolCallsMade: ToolCall[];
  modelUsed: ModelProvider;
  modelDisplayName?: string;
  fallbackUsed?: boolean;
  routingReasoning?: string;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}
