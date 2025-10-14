import { ChatHistory, IChatHistory } from '../models/chat.model';
import { ModelProvider, Message } from '../types';

export class ChatRepository {
  /**
   * Create a new chat history entry
   */
  async create(data: {
    sessionId: string;
    model: ModelProvider;
    messages: Message[];
    toolCallsMade: Array<{
      name: string;
      arguments: Record<string, any>;
      timestamp: Date;
    }>;
  }): Promise<IChatHistory> {
    // Map 'model' to 'modelProvider' for Mongoose schema
    const chatHistory = new ChatHistory({
      sessionId: data.sessionId,
      modelProvider: data.model,
      messages: data.messages,
      toolCallsMade: data.toolCallsMade
    });
    return await chatHistory.save();
  }

  /**
   * Find chat history by session ID
   */
  async findBySessionId(sessionId: string): Promise<IChatHistory[]> {
    return await ChatHistory.find({ sessionId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find chat history by ID
   */
  async findById(id: string): Promise<IChatHistory | null> {
    return await ChatHistory.findById(id).exec();
  }

  /**
   * Count total chats
   */
  async count(): Promise<number> {
    return await ChatHistory.countDocuments();
  }

  /**
   * Count chats by model
   */
  async countByModel(model: ModelProvider): Promise<number> {
    return await ChatHistory.countDocuments({ modelProvider: model });
  }
}
