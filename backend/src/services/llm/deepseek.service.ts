import OpenAI from 'openai';
import { Message, Tool, LLMResponse, ToolCall} from '../../types';

export class DeepSeekService {
  private client: OpenAI;
  private model = 'deepseek-chat';

  constructor() {
    // DeepSeek uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com'
    });
  }

  async *chatStream(messages: Message[], tools: Tool[]): AsyncGenerator<string, LLMResponse, unknown> {
    try {
      const systemMessage = {
        role: 'system',
        content: 'You are DeepSeek V3, a helpful weather assistant with access to real-time weather data. When asked which AI you are, clearly identify yourself as DeepSeek V3 (DeepSeek).'
      };

      const messagesWithSystem = messages[0]?.role === 'system'
        ? messages
        : [systemMessage as Message, ...messages];

      const formattedMessages = messagesWithSystem.map(msg => {
        const formatted: any = {
          role: msg.role,
          content: msg.content === null ? '' : msg.content
        };

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

        if (msg.toolCallId) {
          formatted.tool_call_id = msg.toolCallId;
        }

        return formatted;
      });

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: formattedMessages,
        tools: tools as any,
        tool_choice: 'auto',
        stream: true
      });

      let fullContent = '';
      let toolCalls: ToolCall[] = [];
      let finishReason = '';
      const toolCallsBuffer: any = {};

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullContent += delta.content;
          yield delta.content;
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;
            if (!toolCallsBuffer[index]) {
              toolCallsBuffer[index] = {
                id: toolCall.id || '',
                name: '',
                arguments: ''
              };
            }

            if (toolCall.function?.name) {
              toolCallsBuffer[index].name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              toolCallsBuffer[index].arguments += toolCall.function.arguments;
            }
          }
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
      }

      // Parse tool calls
      toolCalls = Object.values(toolCallsBuffer).map((tc: any) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments ? JSON.parse(tc.arguments) : {}
      }));

      return {
        content: fullContent || null,
        toolCalls,
        finishReason
      };
    } catch (error: any) {
      console.error('DeepSeek API error:', error);
      throw new Error(`DeepSeek error: ${error.message}`);
    }
  }

  async chat(messages: Message[], tools: Tool[]): Promise<LLMResponse> {
    try {
      // Add system message if not present
      const systemMessage = {
        role: 'system',
        content: 'You are DeepSeek V3, a helpful weather assistant with access to real-time weather data. When asked which AI you are, clearly identify yourself as DeepSeek V3 (DeepSeek).'
      };
      
      const messagesWithSystem = messages[0]?.role === 'system' 
        ? messages 
        : [systemMessage as Message, ...messages];

      // Convert our Message type to OpenAI's expected format
      // OpenAI-compatible APIs use snake_case (tool_calls, tool_call_id) while we use camelCase
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
      console.error('DeepSeek API error:', error);
      throw new Error(`DeepSeek error: ${error.message}`);
    }
  }
}
