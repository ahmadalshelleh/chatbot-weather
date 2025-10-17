import { Router } from 'express';
import { EvalController } from '../controllers/eval.controller';

const router = Router();
const evalController = new EvalController();

/**
 * @swagger
 * tags:
 *   name: Evaluation
 *   description: LLM evaluation and testing endpoints
 */

/**
 * Run full evaluation suite
 */
router.post('/run', (req, res) => evalController.runEvaluation(req, res));

/**
 * Run single test case
 */
router.post('/test-case', (req, res) => evalController.runSingleTest(req, res));

/**
 * Get all test cases
 */
router.get('/test-cases', (req, res) => evalController.getTestCases(req, res));

/**
 * Get test categories
 */
router.get('/categories', (req, res) => evalController.getCategories(req, res));

/**
 * Get evaluation results
 */
router.get('/results', (req, res) => evalController.getResults(req, res));

/**
 * Compare models
 */
router.get('/compare', (req, res) => evalController.compareModels(req, res));

export default router;
