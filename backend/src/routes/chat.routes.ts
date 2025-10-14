import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { ChatValidation } from '../validations';
import { sessionMiddleware } from '../middleware/session';

const router = Router();
const chatController = new ChatController();

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a message to the chatbot
 *     description: Send a message to the chatbot and receive a response. Supports tool calling for weather queries.
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
 *                 content: What's the weather like in London?
 *             model: openai
 *             maxIterations: 5
 *     responses:
 *       200:
 *         description: Successful response from the chatbot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *             example:
 *               response: The weather in London is currently 15°C and partly cloudy.
 *               toolCallsMade:
 *                 - id: call_123
 *                   name: getCurrentWeather
 *                   arguments:
 *                     location: London
 *                     unit: celsius
 *               modelUsed: openai
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/chat', sessionMiddleware, ChatValidation.validateChatRequest, (req, res) => chatController.chat(req, res));

/**
 * @swagger
 * /api/chat/history/{sessionId}:
 *   get:
 *     summary: Get chat history for a session
 *     description: Retrieve the conversation history for a specific session ID
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID to retrieve history for
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/chat/history/:sessionId', ChatValidation.validateSessionId, (req, res) => chatController.getHistory(req, res));

export default router;
