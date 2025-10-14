import { ChatRepository } from '../repositories/chat.repository';
import { LLMFactory } from './llm/llm.factory';
import { executeTool, TOOLS } from './tools.service';
import { Message, ModelProvider, ChatResponse } from '../types';

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
}
