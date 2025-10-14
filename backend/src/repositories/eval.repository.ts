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
    const evalResult = new EvalResult(data);
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
