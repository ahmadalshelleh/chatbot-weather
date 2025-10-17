import { ModelProvider } from '../types';

export interface RoutingDecision {
  model: ModelProvider;
  confidence: number;
  reasoning: string;
  fallbackModel?: ModelProvider;
}

export interface ModelCapability {
  model: ModelProvider;
  strengths: string[];
  weaknesses: string[];
  costTier: 'low' | 'medium' | 'high';
  speed: 'fast' | 'medium' | 'slow';
}

export interface RoutingContext {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  availableModels: ModelProvider[];
}

export interface ModelExecutionResult {
  success: boolean;
  model: ModelProvider;
  response?: any;
  error?: string;
  fallbackUsed: boolean;
  fallbackModel?: ModelProvider;
  modelDisplayName?: string;
}

export interface OrchestratorResponse {
  response: string;
  toolCallsMade: any[];
  modelUsed: ModelProvider;
  modelDisplayName: string;
  fallbackUsed: boolean;
  routingReasoning: string;
}
