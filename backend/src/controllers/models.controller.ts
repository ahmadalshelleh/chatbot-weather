import { Request, Response } from 'express';

export class ModelsController {
  /**
   * @swagger
   * /api/models:
   *   get:
   *     summary: Get available LLM models
   *     description: Retrieve a list of all supported LLM providers
   *     tags: [Models]
   *     responses:
   *       200:
   *         description: List of available models
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 models:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Model'
   *             example:
   *               models:
   *                 - id: openai
   *                   name: GPT-3.5 Turbo
   *                   provider: OpenAI
   *                 - id: deepseek
   *                   name: DeepSeek V3
   *                   provider: DeepSeek
   */
  getModels(req: Request, res: Response): void {
    res.json({
      models: [
        { id: 'openai', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
        { id: 'deepseek', name: 'DeepSeek V3', provider: 'DeepSeek' }
      ]
    });
  }
}
