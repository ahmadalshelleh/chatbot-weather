import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { LangGraphOrchestrator } from '../orchestrator/langgraph.orchestrator';
import { SessionRepository } from '../repositories/session.repository';
import { ChatRequest } from '../types';

export class ChatController {
  private chatService: ChatService;
  private orchestrator: LangGraphOrchestrator;
  private sessionRepository: SessionRepository;

  constructor() {
    this.chatService = new ChatService();
    this.sessionRepository = new SessionRepository();
    this.orchestrator = new LangGraphOrchestrator();

    console.log('🔵 Using LangGraph Orchestrator');
  }

  /**
   * @swagger
   * /api/chat:
   *   post:
   *     summary: Send a message to the chatbot
   *     description: Process a chat message with tool calling support across multiple LLM providers
   *     tags: [Chat]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChatRequest'
   *           example:
   *             messages:
   *               - role: user
   *                 content: "What's the weather in Paris?"
   *             model: openai
   *             maxIterations: 5
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ChatResponse'
   *             example:
   *               response: "The current temperature in Paris is 18°C with partly cloudy skies."
   *               toolCallsMade:
   *                 - name: get_current_weather
   *                   arguments:
   *                     location: Paris
   *                     unit: celsius
   *               modelUsed: openai
   *       400:
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, maxIterations = 5 }: ChatRequest = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required and must be a string' });
        return;
      }

      // Session ID is already attached by session middleware
      const sessionId = req.sessionId;

      // Process chat via orchestrator (intelligent routing)
      const response = await this.orchestrator.processChat(
        message,
        sessionId,
        maxIterations
      );

      res.json(response);
    } catch (error: any) {
      console.error('Chat controller error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @swagger
   * /api/chat/history/{sessionId}:
   *   get:
   *     summary: Get chat history for a session
   *     description: Retrieve all chat messages for a specific session ID
   *     tags: [Chat]
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *         example: session-1234567890
   *     responses:
   *       200:
   *         description: Chat history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *       400:
   *         description: Missing session ID
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const history = await this.chatService.getChatHistory(sessionId);
      res.json(history);
    } catch (error: any) {
      console.error('Get history error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @swagger
   * /api/chat/stream:
   *   post:
   *     summary: Send a message to the chatbot with streaming response
   *     description: Process a chat message with streaming and tool calling support
   *     tags: [Chat]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChatRequest'
   *     responses:
   *       200:
   *         description: Streaming response
   *         content:
   *           text/event-stream:
   *             schema:
   *               type: string
   */
  async chatStream(req: Request, res: Response): Promise<void> {
    try {
      const { message, maxIterations = 5 }: ChatRequest = req.body;
      const sessionId = req.sessionId;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required and must be a string' });
        return;
      }

      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      console.log(`📡 Starting SSE stream for session: ${sessionId}`);

      // Process chat with streaming via orchestrator
      const stream = this.orchestrator.processChatStream(
        message,
        sessionId,
        maxIterations
      );

      let eventCount = 0;

      for await (const event of stream) {
        eventCount++;
        console.log(`📤 Sending SSE event #${eventCount}: ${event.type}`);

        // Send SSE event
        const sseData = `data: ${JSON.stringify(event)}\n\n`;
        res.write(sseData);

        // Flush immediately if available
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }

      console.log(`✅ Stream complete. Sent ${eventCount} events`);

      // End the stream
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Chat stream controller error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * Deactivate a session
   */
  async deactivateSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      await this.sessionRepository.deactivateSession(sessionId);
      res.json({ success: true, message: 'Session deactivated' });
    } catch (error: any) {
      console.error('Deactivate session error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
