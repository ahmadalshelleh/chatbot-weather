import { Request, Response, NextFunction } from 'express';
import { ModerationService } from '../services/moderation.service';

const moderationService = new ModerationService();

/**
 * Middleware to check content appropriateness and scope before processing
 */
export async function moderationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userMessage = req.body.message || req.body.messages?.[req.body.messages.length - 1]?.content;

    if (!userMessage) {
      res.status(400).json({ error: 'No message provided' });
      return;
    }

    // Run all checks in parallel for efficiency
    const [moderationResult, scopeResult, emotionalTone] = await Promise.all([
      moderationService.checkContent(userMessage),
      Promise.resolve(moderationService.isWithinScope(userMessage)),
      Promise.resolve(moderationService.detectEmotionalTone(userMessage))
    ]);

    // Log moderation results for monitoring
    console.log('🛡️ Moderation Check:', {
      appropriate: moderationResult.isAppropriate,
      inScope: scopeResult.isWithinScope,
      tone: emotionalTone.tone
    });

    // Get moderation response if content should be blocked
    const moderationResponse = moderationService.getModerationResponse(
      moderationResult,
      scopeResult,
      emotionalTone
    );

    if (moderationResponse) {
      console.log('🚫 Content blocked - sending moderation response');

      // Check if this is a streaming request
      const isStreamingRequest = req.path.includes('/stream');

      if (isStreamingRequest) {
        // Send as Server-Sent Events for streaming endpoint
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send the response as a 'done' event
        res.write(`data: ${JSON.stringify({
          type: 'done',
          data: {
            response: moderationResponse,
            moderated: true,
            reason: !moderationResult.isAppropriate ? 'inappropriate_content' : 'out_of_scope',
            modelUsed: 'moderation',
            toolCallsMade: [],
            fallbackUsed: false,
            routingReasoning: 'Content moderation'
          }
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // Send as JSON for regular endpoint
        res.status(200).json({
          response: moderationResponse,
          moderated: true,
          reason: !moderationResult.isAppropriate ? 'inappropriate_content' : 'out_of_scope',
          modelUsed: 'moderation',
          toolCallsMade: []
        });
      }
      return;
    }

    // Attach moderation context to request for downstream use
    req.moderationContext = {
      emotionalTone,
      scopeResult,
      moderationResult
    };

    next();
  } catch (error: any) {
    console.error('Moderation middleware error:', error);
    // Don't block request on moderation failure
    next();
  }
}

// Extend Express Request type to include moderation context
declare global {
  namespace Express {
    interface Request {
      moderationContext?: {
        emotionalTone: any;
        scopeResult: any;
        moderationResult: any;
      };
    }
  }
}
