import { Session, ISession } from '../models/session.model';
import { Message } from '../types';

export class SessionRepository {
  /**
   * Create a new session
   */
  async createSession(sessionId: string): Promise<ISession> {
    const session = new Session({
      sessionId,
      messages: [],
      metadata: {
        createdAt: new Date(),
        lastActive: new Date(),
        messageCount: 0,
        totalTokens: 0
      },
      active: true
    });
    return await session.save();
  }

  /**
   * Get session by ID, create if doesn't exist
   */
  async getOrCreateSession(sessionId: string) {
    const existingSession = await Session.findOne({ sessionId }).exec();

    if (!existingSession) {
      return await this.createSession(sessionId);
    }

    return existingSession;
  }

  /**
   * Get conversation history for a session
   * Returns the messages array
   */
  async getSessionHistory(sessionId: string, limit?: number): Promise<Message[]> {
    const session = await Session.findOne({ sessionId }).exec();

    if (!session) {
      return [];
    }

    let messages = session.messages;

    // Apply limit if specified (return last N messages)
    if (limit && limit > 0) {
      messages = messages.slice(-limit);
    }

    return messages;
  }

  /**
   * Append new messages to a session
   */
  async appendMessages(sessionId: string, messages: Message[]) {
    const session = await this.getOrCreateSession(sessionId);

    if (!session) {
      throw new Error('Failed to get or create session');
    }

    // Add new messages
    session.messages.push(...messages);

    // Update metadata
    session.metadata.lastActive = new Date();
    session.metadata.messageCount = session.messages.length;

    return await session.save();
  }

  /**
   * Append a single message to a session
   */
  async appendMessage(sessionId: string, message: Message) {
    return await this.appendMessages(sessionId, [message]);
  }

  /**
   * Get full session document
   */
  async getSession(sessionId: string): Promise<ISession | null> {
    return await Session.findOne({ sessionId }).exec();
  }

  /**
   * Mark session as inactive
   */
  async deactivateSession(sessionId: string): Promise<ISession | null> {
    return await Session.findOneAndUpdate(
      { sessionId },
      { active: false },
      { new: true }
    ).exec();
  }

  /**
   * Delete old inactive sessions (cleanup)
   * @param daysOld - Delete sessions older than this many days
   */
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Session.deleteMany({
      active: false,
      'metadata.lastActive': { $lt: cutoffDate }
    }).exec();

    return result.deletedCount || 0;
  }

  /**
   * Get session count
   */
  async getActiveSessionCount(): Promise<number> {
    return await Session.countDocuments({ active: true });
  }

  /**
   * Clear all messages from a session
   */
  async clearSessionMessages(sessionId: string): Promise<ISession | null> {
    return await Session.findOneAndUpdate(
      { sessionId },
      {
        messages: [],
        'metadata.lastActive': new Date(),
        'metadata.messageCount': 0
      },
      { new: true }
    ).exec();
  }

  /**
   * Update token count for a session
   */
  async updateTokenCount(sessionId: string, tokens: number): Promise<ISession | null> {
    return await Session.findOneAndUpdate(
      { sessionId },
      {
        $inc: { 'metadata.totalTokens': tokens },
        'metadata.lastActive': new Date()
      },
      { new: true }
    ).exec();
  }
}
