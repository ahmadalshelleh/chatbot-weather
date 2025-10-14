import { Router } from 'express';
import { ModelsController } from '../controllers/models.controller';

const router = Router();
const modelsController = new ModelsController();

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: Get available LLM models
 *     description: Retrieve a list of all available LLM providers and models
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: List of available models
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Model'
 *             example:
 *               - id: openai
 *                 name: OpenAI GPT-4
 *                 provider: OpenAI
 *               - id: anthropic
 *                 name: Anthropic Claude
 *                 provider: Anthropic
 *               - id: deepseek
 *                 name: DeepSeek
 *                 provider: DeepSeek
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/models', (req, res) => modelsController.getModels(req, res));

export default router;
