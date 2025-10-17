import { EvalResult, IEvalResult } from '../models/eval.model';
import { ModelProvider } from '../types';

export class EvalRepository {
  /**
   * Create a new evaluation result
   */
  async create(data: {
    testId: string;
    model: ModelProvider;
    passed: boolean;
    score: number;
    latencyMs: number;
    toolsCalled: string[];
    toolCallCount: number;
    response: string;
    errors: string[];
    metadata: Record<string, any>;
  }): Promise<IEvalResult> {
    const evalResult = new EvalResult({
      testId: data.testId,
      modelProvider: data.model,  // Map to schema field name
      passed: data.passed,
      score: data.score,
      latencyMs: data.latencyMs,
      toolsCalled: data.toolsCalled,
      toolCallCount: data.toolCallCount,
      response: data.response,
      errorMessages: data.errors,  // Map to schema field name
      metadata: data.metadata
    });
    return await evalResult.save();
  }

  /**
   * Find evaluation results by test ID
   */
  async findByTestId(testId: string): Promise<IEvalResult[]> {
    return await EvalResult.find({ testId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find evaluation results by model
   */
  async findByModel(model: ModelProvider): Promise<IEvalResult[]> {
    return await EvalResult.find({ modelProvider: model })
      .sort({ createdAt: -1 })
      .exec();
  }
}
