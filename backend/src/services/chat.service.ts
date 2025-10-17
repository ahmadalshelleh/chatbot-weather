import { ChatRepository } from '../repositories/chat.repository';
import { LLMFactory } from './llm/llm.factory';
import { executeTool, TOOLS } from './tools.service';
import { Message, ModelProvider, ChatResponse, LLMResponse } from '../types';

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  /**
   * Process a chat request with tool calling
   */
  async processChat(
    messages: Message[],
    model: ModelProvider,
    sessionId: string,
    maxIterations: number = 5
  ): Promise<ChatResponse> {
    const llmService = LLMFactory.create(model);
    const conversationMessages: Message[] = [...messages];
    const toolCallsMade: any[] = [];

    // Agent loop for tool calling
    for (let i = 0; i < maxIterations; i++) {
      const response = await llmService.chat(conversationMessages, TOOLS);

      // If no tool calls, save and return final response
      if (response.toolCalls.length === 0) {
        // Save to database via repository
        await this.chatRepository.create({
          sessionId,
          model: model,
          messages: conversationMessages,
          toolCallsMade
        });

        return {
          response: response.content || 'No response generated',
          toolCallsMade,
          modelUsed: model
        };
      }

      // Add assistant message with ALL tool calls (must be ONE message, not multiple)
      conversationMessages.push({
        role: 'assistant',
        content: null,
        toolCalls: response.toolCalls
      });

      // Execute each tool call and add tool result messages
      for (const toolCall of response.toolCalls) {
        toolCallsMade.push({
          name: toolCall.name,
          arguments: toolCall.arguments,
          timestamp: new Date()
        });

        const toolResult = await executeTool(toolCall.name, toolCall.arguments);

        // Add tool result
        conversationMessages.push({
          role: 'tool',
          toolCallId: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }
    }

    // Max iterations reached - still save
    await this.chatRepository.create({
      sessionId,
      model: model,
      messages: conversationMessages,
      toolCallsMade
    });

    return {
      response: 'Max iterations reached',
      toolCallsMade,
      modelUsed: model
    };
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string) {
    return await this.chatRepository.findBySessionId(sessionId);
  }

  /**
   * Get total chat count
   */
  async getTotalChats() {
    return await this.chatRepository.count();
  }

  /**
   * Process a chat request with streaming and tool calling
   */
  async *processChatStream(
    messages: Message[],
    model: ModelProvider,
    sessionId: string,
    maxIterations: number = 5
  ): AsyncGenerator<{ type: 'content' | 'tool' | 'done', data: any }, void, unknown> {
    const llmService = LLMFactory.create(model);
    const conversationMessages: Message[] = [...messages];
    const toolCallsMade: any[] = [];

    // Agent loop for tool calling
    for (let i = 0; i < maxIterations; i++) {
      const streamGen = llmService.chatStream(conversationMessages, TOOLS);
      let finalResponse: LLMResponse | null = null;

      // Stream content chunks and collect final response
      while (true) {
        const result = await streamGen.next();

        if (result.done) {
          // Generator completed - return value contains the LLMResponse
          finalResponse = result.value as LLMResponse;
          break;
        } else {
          // Yielded value is a content chunk
          yield { type: 'content', data: result.value };
        }
      }

      if (!finalResponse) break;

      // If no tool calls, we're done
      if (finalResponse.toolCalls.length === 0) {
        // Save to database
        await this.chatRepository.create({
          sessionId,
          model: model,
          messages: conversationMessages,
          toolCallsMade
        });

        yield {
          type: 'done',
          data: {
            response: finalResponse.content || 'No response generated',
            toolCallsMade,
            modelUsed: model
          }
        };
        return;
      }

      // Add assistant message with tool calls
      conversationMessages.push({
        role: 'assistant',
        content: null,
        toolCalls: finalResponse.toolCalls
      });

      // Execute each tool call
      for (const toolCall of finalResponse.toolCalls) {
        toolCallsMade.push({
          name: toolCall.name,
          arguments: toolCall.arguments,
          timestamp: new Date()
        });

        yield {
          type: 'tool',
          data: {
            name: toolCall.name,
            arguments: toolCall.arguments
          }
        };

        const toolResult = await executeTool(toolCall.name, toolCall.arguments);

        // Add tool result
        conversationMessages.push({
          role: 'tool',
          toolCallId: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }
    }

    // Max iterations reached
    await this.chatRepository.create({
      sessionId,
      model: model,
      messages: conversationMessages,
      toolCallsMade
    });

    yield {
      type: 'done',
      data: {
        response: 'Max iterations reached',
        toolCallsMade,
        modelUsed: model
      }
    };
  }
}
