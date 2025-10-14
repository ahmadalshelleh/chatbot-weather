import OpenAI from 'openai';
import { Message, Tool, LLMResponse, ToolCall } from '../../types';

export class OpenAIService {
  private client: OpenAI;
  private model = 'gpt-3.5-turbo';

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async chat(messages: Message[], tools: Tool[]): Promise<LLMResponse> {
    try {
      // Add system message if not present
      const systemMessage = {
        role: 'system',
        content: 'You are GPT-3.5 Turbo by OpenAI, a helpful weather assistant with access to real-time weather data. When asked which AI you are, clearly identify yourself as GPT-3.5 Turbo (OpenAI).'
      };
      
      const messagesWithSystem = messages[0]?.role === 'system' 
        ? messages 
        : [systemMessage as Message, ...messages];

      // Convert our Message type to OpenAI's expected format
      // OpenAI uses snake_case (tool_calls, tool_call_id) while we use camelCase
      const formattedMessages = messagesWithSystem.map(msg => {
        const formatted: any = {
          role: msg.role,
          content: msg.content === null ? '' : msg.content
        };

        // Add tool_calls if present (assistant messages with tool calls)
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          formatted.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }));
        }

        // Add tool_call_id if present (tool result messages)
        if (msg.toolCallId) {
          formatted.tool_call_id = msg.toolCallId;
        }

        return formatted;
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: formattedMessages,
        tools: tools as any,
        tool_choice: 'auto'
      });

      const message = response.choices[0].message;

      const toolCalls: ToolCall[] = (message.tool_calls || []).map(tc => {
        if (tc.type === 'function') {
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments)
          };
        }
        return { id: tc.id, name: '', arguments: {} };
      });

      return {
        content: message.content,
        toolCalls,
        finishReason: response.choices[0].finish_reason
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI error: ${error.message}`);
    }
  }
}
