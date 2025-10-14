import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { ChatRequest } from '../types';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
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
      const { messages, model, maxIterations = 5 }: ChatRequest = req.body;

      // Session ID is already attached by session middleware
      const sessionId = req.sessionId;

      // Process chat via service
      const response = await this.chatService.processChat(
        messages,
        model,
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
}
