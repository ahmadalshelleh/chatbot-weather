import { Request, Response, NextFunction } from 'express';
import { ChatRequest } from '../types';

export class ChatValidation {
  /**
   * Validate chat request body
   */
  static validateChatRequest(req: Request, res: Response, next: NextFunction): void {
    const { message }: ChatRequest = req.body;

    // Check if message is provided
    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    // Validate message is a non-empty string
    if (typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'Message must be a non-empty string' });
      return;
    }

    next();
  }

  /**
   * Validate session ID parameter
   */
  static validateSessionId(req: Request, res: Response, next: NextFunction): void {
    const { sessionId } = req.params;

    if (!sessionId || sessionId.trim() === '') {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    next();
  }
}

