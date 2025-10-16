import { ModelProvider } from '../../types';
import { OpenAIService } from './openai.service';
import { DeepSeekService } from './deepseek.service';

export interface ILLMService {
  chat(messages: any[], tools: any[]): Promise<any>;
}

export class LLMFactory {
  static create(provider: ModelProvider): ILLMService {
    switch (provider) {
      case 'openai':
        return new OpenAIService();
      case 'deepseek':
        return new DeepSeekService();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
