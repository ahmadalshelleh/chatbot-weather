import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include sessionId
declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

/**
 * Session middleware
 * Extracts or generates a session ID for each request
 * Session ID can be provided via 'x-session-id' header
 * If not provided, a new session ID is generated
 */
export const sessionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get session ID from header or generate a new one
  const sessionId = (req.headers['x-session-id'] as string) || `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Attach session ID to request object
  req.sessionId = sessionId;
  
  // Set session ID in response header for client to use in subsequent requests
  res.setHeader('x-session-id', sessionId);
  
  next();
};

