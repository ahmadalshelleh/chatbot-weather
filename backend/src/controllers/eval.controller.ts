import { Request, Response } from 'express';
import { EvalService, EvalConfig } from '../services/eval.service';
import { EvalRepository } from '../repositories/eval.repository';
import { ModelProvider } from '../types';

export class EvalController {
  private evalService: EvalService;
  private evalRepository: EvalRepository;

  constructor() {
    this.evalService = new EvalService();
    this.evalRepository = new EvalRepository();
  }

  /**
   * @swagger
   * /api/eval/run:
   *   post:
   *     summary: Run evaluation suite
   *     description: Execute test cases against specified models
   *     tags: [Evaluation]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               models:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["openai", "deepseek"]
   *               categories:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["routing", "quality"]
   *               iterations:
   *                 type: number
   *                 example: 1
   *               testIds:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Evaluation completed successfully
   *       500:
   *         description: Server error
   */
  async runEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const config: EvalConfig = req.body;

      console.log('📊 Starting evaluation via API...');
      const report = await this.evalService.runEvaluation(config);

      res.json({
        success: true,
        report
      });
    } catch (error: any) {
      console.error('Evaluation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/eval/test-case:
   *   post:
   *     summary: Run single test case
   *     description: Execute a specific test case against a model
   *     tags: [Evaluation]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               testId:
   *                 type: string
   *                 example: "routing-weather-001"
   *               model:
   *                 type: string
   *                 example: "openai"
   *     responses:
   *       200:
   *         description: Test executed successfully
   *       404:
   *         description: Test case not found
   *       500:
   *         description: Server error
   */
  async runSingleTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId, model } = req.body;

      if (!testId || !model) {
        res.status(400).json({
          success: false,
          error: 'testId and model are required'
        });
        return;
      }

      const testCase = this.evalService.getTestCase(testId);
      if (!testCase) {
        res.status(404).json({
          success: false,
          error: `Test case ${testId} not found`
        });
        return;
      }

      console.log(`🧪 Running single test: ${testId} on ${model}`);
      const result = await this.evalService.runSingleTest(testCase, model as ModelProvider);

      res.json({
        success: true,
        result
      });
    } catch (error: any) {
      console.error('Single test error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/eval/test-cases:
   *   get:
   *     summary: Get all test cases
   *     description: Retrieve list of available test cases
   *     tags: [Evaluation]
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category
   *     responses:
   *       200:
   *         description: Test cases retrieved successfully
   */
  async getTestCases(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;

      let testCases = this.evalService.getTestCases();

      if (category) {
        testCases = this.evalService.getTestCasesByCategory(category as string);
      }

      res.json({
        success: true,
        count: testCases.length,
        testCases
      });
    } catch (error: any) {
      console.error('Get test cases error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/eval/categories:
   *   get:
   *     summary: Get test categories
   *     description: Retrieve list of test categories
   *     tags: [Evaluation]
   *     responses:
   *       200:
   *         description: Categories retrieved successfully
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = this.evalService.getCategories();

      res.json({
        success: true,
        categories
      });
    } catch (error: any) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/eval/results:
   *   get:
   *     summary: Get evaluation results
   *     description: Retrieve past evaluation results
   *     tags: [Evaluation]
   *     parameters:
   *       - in: query
   *         name: testId
   *         schema:
   *           type: string
   *       - in: query
   *         name: model
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Results retrieved successfully
   */
  async getResults(req: Request, res: Response): Promise<void> {
    try {
      const { testId, model } = req.query;

      let results: any[] = [];

      if (testId) {
        results = await this.evalRepository.findByTestId(testId as string);
      } else if (model) {
        results = await this.evalRepository.findByModel(model as ModelProvider);
      } else {
        // Could add a findAll method to repository if needed
        results = [];
      }

      res.json({
        success: true,
        count: results.length,
        results
      });
    } catch (error: any) {
      console.error('Get results error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/eval/compare:
   *   get:
   *     summary: Compare models
   *     description: Compare performance of different models
   *     tags: [Evaluation]
   *     parameters:
   *       - in: query
   *         name: models
   *         schema:
   *           type: string
   *         description: Comma-separated model names
   *         example: "openai,deepseek"
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Comparison generated successfully
   */
  async compareModels(req: Request, res: Response): Promise<void> {
    try {
      const { models: modelsParam, category } = req.query;

      if (!modelsParam) {
        res.status(400).json({
          success: false,
          error: 'models parameter is required (comma-separated)'
        });
        return;
      }

      const models = (modelsParam as string).split(',') as ModelProvider[];

      // Get recent results for comparison
      // In a real implementation, you'd want to specify which evaluation run to compare
      // For now, we'll just return a message about running a new evaluation
      res.json({
        success: true,
        message: 'To compare models, run an evaluation with multiple models first',
        hint: 'POST /api/eval/run with { "models": ["openai", "deepseek"] }'
      });
    } catch (error: any) {
      console.error('Compare models error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
