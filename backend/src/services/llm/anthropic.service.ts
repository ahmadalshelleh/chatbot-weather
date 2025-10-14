import Anthropic from '@anthropic-ai/sdk';
import { Message, Tool, LLMResponse, ToolCall } from '../../types';

export class AnthropicService {
  private client: Anthropic;
  private model = 'claude-3-5-sonnet-20241022';

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async chat(messages: Message[], tools: Tool[]): Promise<LLMResponse> {
    try {
      // Convert OpenAI tool format to Anthropic format
      const anthropicTools = tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      }));

      // Extract system message
      const systemMsg = messages.find(m => m.role === 'system')?.content ||
                        'You are Claude 3.5 Sonnet by Anthropic, a helpful weather assistant with access to real-time weather data. When asked which AI you are, clearly identify yourself as Claude 3.5 Sonnet (Anthropic).';

      const filteredMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'tool' ? 'user' as const : m.role as 'user' | 'assistant',
          content: m.content || JSON.stringify(m.toolCalls)
        }));

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemMsg,
        messages: filteredMessages,
        tools: anthropicTools
      });

      // Parse tool calls
      const toolCalls: ToolCall[] = [];
      let textContent = '';

      for (const block of response.content) {
        if (block.type === 'text') {
          textContent = block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input as Record<string, any>
          });
        }
      }

      return {
        content: textContent,
        toolCalls,
        finishReason: response.stop_reason || 'end_turn'
      };
    } catch (error: any) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic error: ${error.message}`);
    }
  }
}
