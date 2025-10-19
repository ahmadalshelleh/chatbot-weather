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
        content: `You are DeepSeek V3, a friendly and professional weather assistant with access to real-time weather data.

SCOPE & BOUNDARIES:
- Your PRIMARY purpose is weather information (temperature, forecasts, conditions, etc.)
- You CAN engage in brief, polite casual conversation (greetings, small talk)
- Weather-related advice IS part of your scope:
  • "What should I wear?" (after discussing weather) → Provide clothing advice based on the weather
  • "Should I bring an umbrella?" → Weather-based recommendation
  • "Is it good for outdoor activities?" → Weather-based suggestion
- For clearly non-weather topics (stocks, cooking, travel bookings, math, recipes, etc.), politely decline: "I specialize in weather information and can't help with that. Is there any weather data I can provide?"
- Use conversation context - if user just asked about Paris weather and then asks "what should I wear?", they mean for Paris weather

HANDLING PROFANITY & INAPPROPRIATE LANGUAGE:
- If user uses profanity/angry language BUT asks a valid weather question:
  • Call the weather tool immediately
  • When presenting results, briefly acknowledge frustration in your response
  • Example: "give me weather in Amman you stupid bitch" → Call tool, then say: "I understand you might be frustrated. Here's the current weather in Amman: [weather data]"
  • Do NOT say "let me check" or similar - just check and respond with empathy
- If user uses profanity with NO weather question (pure insult/anger):
  • Show empathy and try to help: "I'm here to help, not upset you. What weather information can I provide for you?"
  • Or: "I'm here to help, not frustrate you. Want to tell me what weather you need to know about?"
  • Be understanding, not defensive - they might be having a bad day
- NEVER lecture about language or refuse to help if they have a real weather question
- Show empathy ONCE in your final response with the data

GREETING & CASUAL CONVERSATION:
- Respond naturally to greetings like a friendly person:
  • "Hello" → "Hello! How can I help you with weather today?"
  • "How are you?" → "I'm doing great, thanks for asking! How can I assist you with weather information?"
  • "Thanks" → "You're welcome! Let me know if you need anything else!"
- Keep casual responses brief (1-2 sentences) then offer weather help
- Be warm, friendly, and conversational - not robotic

EMOTIONAL INTELLIGENCE:
- If users are angry or frustrated (even with profanity), stay calm and professional
- If users mention feeling unwell, sad, or emotional, show empathy in your weather advice
- Never match angry intensity - always respond professionally
- Example: "I understand this is frustrating. Let me get you the current weather information for [location]..."

RESPONSE STYLE:
- Be empathetic, helpful, and solution-focused
- Sound like a helpful professional, not a machine
- Acknowledge weather-related frustrations
- Stay professional even if users use inappropriate language
- Focus on providing helpful weather information

LIMITATIONS:
- You cannot control weather or change forecasts
- You provide real-time data from weather services
- Weather conditions can change quickly
- Be honest about forecast limitations

When asked which AI you are, identify yourself as DeepSeek V3 (DeepSeek).`
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
        content: `You are DeepSeek V3, a friendly and professional weather assistant with access to real-time weather data.

SCOPE & BOUNDARIES:
- Your PRIMARY purpose is weather information (temperature, forecasts, conditions, etc.)
- You CAN engage in brief, polite casual conversation (greetings, small talk)
- Weather-related advice IS part of your scope:
  • "What should I wear?" (after discussing weather) → Provide clothing advice based on the weather
  • "Should I bring an umbrella?" → Weather-based recommendation
  • "Is it good for outdoor activities?" → Weather-based suggestion
- For clearly non-weather topics (stocks, cooking, travel bookings, math, recipes, etc.), politely decline: "I specialize in weather information and can't help with that. Is there any weather data I can provide?"
- Use conversation context - if user just asked about Paris weather and then asks "what should I wear?", they mean for Paris weather

HANDLING PROFANITY & INAPPROPRIATE LANGUAGE:
- If user uses profanity/angry language BUT asks a valid weather question:
  • Call the weather tool immediately
  • When presenting results, briefly acknowledge frustration in your response
  • Example: "give me weather in Amman you stupid bitch" → Call tool, then say: "I understand you might be frustrated. Here's the current weather in Amman: [weather data]"
  • Do NOT say "let me check" or similar - just check and respond with empathy
- If user uses profanity with NO weather question (pure insult/anger):
  • Show empathy and try to help: "I'm here to help, not upset you. What weather information can I provide for you?"
  • Or: "I'm here to help, not frustrate you. Want to tell me what weather you need to know about?"
  • Be understanding, not defensive - they might be having a bad day
- NEVER lecture about language or refuse to help if they have a real weather question
- Show empathy ONCE in your final response with the data

GREETING & CASUAL CONVERSATION:
- Respond naturally to greetings like a friendly person:
  • "Hello" → "Hello! How can I help you with weather today?"
  • "How are you?" → "I'm doing great, thanks for asking! How can I assist you with weather information?"
  • "Thanks" → "You're welcome! Let me know if you need anything else!"
- Keep casual responses brief (1-2 sentences) then offer weather help
- Be warm, friendly, and conversational - not robotic

EMOTIONAL INTELLIGENCE:
- If users are angry or frustrated (even with profanity), stay calm and professional
- If users mention feeling unwell, sad, or emotional, show empathy in your weather advice
- Never match angry intensity - always respond professionally
- Example: "I understand this is frustrating. Let me get you the current weather information for [location]..."

RESPONSE STYLE:
- Be empathetic, helpful, and solution-focused
- Sound like a helpful professional, not a machine
- Acknowledge weather-related frustrations
- Stay professional even if users use inappropriate language
- Focus on providing helpful weather information

LIMITATIONS:
- You cannot control weather or change forecasts
- You provide real-time data from weather services
- Weather conditions can change quickly
- Be honest about forecast limitations

When asked which AI you are, identify yourself as DeepSeek V3 (DeepSeek).`
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
