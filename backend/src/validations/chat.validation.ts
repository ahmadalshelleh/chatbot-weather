import { Request, Response, NextFunction } from 'express';
import { ChatRequest } from '../types';

export class ChatValidation {
  /**
   * Validate chat request body
   */
  static validateChatRequest(req: Request, res: Response, next: NextFunction): void {
    const { messages, model }: ChatRequest = req.body;

    // Check if messages and model are provided
    if (!messages || !model) {
      res.status(400).json({ error: 'Missing messages or model' });
      return;
    }

    // Validate messages is a non-empty array
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages must be a non-empty array' });
      return;
    }

    // Validate each message has required fields
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message.role || !message.content) {
        res.status(400).json({ 
          error: `Message at index ${i} is missing role or content` 
        });
        return;
      }
    }

    // Validate model is a string
    if (typeof model !== 'string' || model.trim() === '') {
      res.status(400).json({ error: 'Model must be a non-empty string' });
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

