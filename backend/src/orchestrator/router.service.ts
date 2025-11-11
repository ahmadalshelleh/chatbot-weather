import OpenAI from 'openai';
import { RoutingDecision, RoutingContext } from './routing.types';
import { ModelProvider } from '../types';

export class RouterService {
  private client: OpenAI;
  private routerModel = 'gpt-4o-mini';

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for RouterService');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Analyze user message and decide which model should handle it
   */
  async routeRequest(context: RoutingContext): Promise<RoutingDecision> {
    try {
      const systemPrompt = this.buildRoutingPrompt(context);

      const response = await this.client.chat.completions.create({
        model: this.routerModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context.userMessage }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const decision = JSON.parse(response.choices[0].message.content || '{}');

      return {
        model: decision.model || 'openai',
        confidence: decision.confidence || 0.5,
        reasoning: decision.reasoning || 'Default routing',
        fallbackModel: this.getFallbackModel(decision.model)
      };
    } catch (error: any) {
      console.error('Router error:', error);
      // Default to openai if routing fails
      return {
        model: 'openai',
        confidence: 0.5,
        reasoning: 'Routing failed, using default model',
        fallbackModel: 'deepseek'
      };
    }
  }

  /**
   * Build the routing prompt for the router LLM
   */
  private buildRoutingPrompt(context: RoutingContext): string {
    return `You are a routing assistant that analyzes user messages and decides which AI model should handle the request.

Available Models:
1. "openai" (GPT-3.5 Turbo):
   - Best for: Friendly conversations, greetings, general questions, casual chat
   - Strengths: Natural conversation, empathy, general knowledge
   - Use when: User is chatting casually, asking opinions, making small talk

2. "deepseek" (DeepSeek V3):
   - Best for: Weather queries, data analysis, technical reasoning, calculations
   - Strengths: Data processing, weather analysis, technical accuracy
   - Use when: User asks about weather, needs data analysis, technical questions

Routing Rules:
- If message contains weather-related keywords (weather, temperature, rain, forecast, etc.) → use "deepseek"
- If message is a greeting or casual conversation → use "openai"
- If message asks for data analysis or calculations → use "deepseek"
- If unsure, default to "openai"
- Consider conversation context: maintain consistency with previous model if follow-up question

User's Message: "${context.userMessage}"

${context.conversationHistory.length > 0 ? `Recent Conversation:\n${context.conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "model": "openai" or "deepseek",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of why this model was chosen"
}`;
  }

  /**
   * Get fallback model for each primary model
   */
  private getFallbackModel(primaryModel: string): ModelProvider {
    const fallbackMap: Record<string, ModelProvider> = {
      'openai': 'deepseek',
      'deepseek': 'openai'
    };

    return fallbackMap[primaryModel] || 'openai';
  }

  /**
   * Get display name for model
   */
  getModelDisplayName(model: ModelProvider): string {
    const displayNames: Record<ModelProvider, string> = {
      'openai': 'GPT-3.5 Turbo',
      'deepseek': 'DeepSeek V3'
    };

    return displayNames[model] || model;
  }
}
