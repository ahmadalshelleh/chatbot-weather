import { ModelProvider } from '../types';
import { ScoringResult } from './scoring';

export interface EvalMetrics {
  testId: string;
  model: ModelProvider;
  category: string;
  passed: boolean;
  score: number;
  latencyMs: number;
  toolsCalled: string[];
  toolCallCount: number;
  response: string;
  errorOccurred: boolean;
  fallbackUsed: boolean;
  routingConfidence: number;
  scoringResult: ScoringResult;
  timestamp: Date;
}

export interface AggregateMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  avgScore: number;
  avgLatency: number;
  avgConfidence: number;
  toolCallSuccessRate: number;
  errorRate: number;
  fallbackRate: number;
}

export interface CategoryMetrics {
  category: string;
  totalTests: number;
  passedTests: number;
  passRate: number;
  avgScore: number;
}

export interface ModelComparison {
  models: ModelProvider[];
  metrics: Record<ModelProvider, AggregateMetrics>;
  winner: {
    overall: ModelProvider;
    byMetric: {
      passRate: ModelProvider;
      avgScore: ModelProvider;
      latency: ModelProvider;
      toolSuccess: ModelProvider;
      reliability: ModelProvider;
    };
  };
}

/**
 * Calculate pass rate from results
 */
export function calculatePassRate(results: EvalMetrics[]): number {
  if (results.length === 0) return 0;
  const passed = results.filter(r => r.passed).length;
  return passed / results.length;
}

/**
 * Calculate average score from results
 */
export function calculateAverageScore(results: EvalMetrics[]): number {
  if (results.length === 0) return 0;
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  return totalScore / results.length;
}

/**
 * Calculate average latency from results
 */
export function calculateAverageLatency(results: EvalMetrics[]): number {
  if (results.length === 0) return 0;
  const totalLatency = results.reduce((sum, r) => sum + r.latencyMs, 0);
  return Math.round(totalLatency / results.length);
}

/**
 * Calculate average routing confidence
 */
export function calculateAverageConfidence(results: EvalMetrics[]): number {
  if (results.length === 0) return 0;
  const totalConfidence = results.reduce((sum, r) => sum + r.routingConfidence, 0);
  return totalConfidence / results.length;
}

/**
 * Calculate tool call success rate
 * Success = test passed AND tools were used correctly (if expected)
 */
export function calculateToolSuccessRate(results: EvalMetrics[]): number {
  const toolTests = results.filter(r => r.toolCallCount > 0 || r.category === 'tools');
  if (toolTests.length === 0) return 1.0;

  const successful = toolTests.filter(r => r.passed).length;
  return successful / toolTests.length;
}

/**
 * Calculate error rate
 */
export function calculateErrorRate(results: EvalMetrics[]): number {
  if (results.length === 0) return 0;
  const errors = results.filter(r => r.errorOccurred).length;
  return errors / results.length;
}

/**
 * Calculate fallback usage rate
 */
export function calculateFallbackRate(results: EvalMetrics[]): number {
  if (results.length === 0) return 0;
  const fallbacks = results.filter(r => r.fallbackUsed).length;
  return fallbacks / results.length;
}

/**
 * Calculate aggregate metrics from results
 */
export function calculateAggregateMetrics(results: EvalMetrics[]): AggregateMetrics {
  const passedTests = results.filter(r => r.passed).length;

  return {
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    passRate: calculatePassRate(results),
    avgScore: calculateAverageScore(results),
    avgLatency: calculateAverageLatency(results),
    avgConfidence: calculateAverageConfidence(results),
    toolCallSuccessRate: calculateToolSuccessRate(results),
    errorRate: calculateErrorRate(results),
    fallbackRate: calculateFallbackRate(results)
  };
}

/**
 * Group results by category
 */
export function groupByCategory(results: EvalMetrics[]): Record<string, CategoryMetrics> {
  const categories: Record<string, EvalMetrics[]> = {};

  // Group results
  for (const result of results) {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
  }

  // Calculate metrics for each category
  const categoryMetrics: Record<string, CategoryMetrics> = {};
  for (const [category, categoryResults] of Object.entries(categories)) {
    const passedTests = categoryResults.filter(r => r.passed).length;
    categoryMetrics[category] = {
      category,
      totalTests: categoryResults.length,
      passedTests,
      passRate: calculatePassRate(categoryResults),
      avgScore: calculateAverageScore(categoryResults)
    };
  }

  return categoryMetrics;
}

/**
 * Group results by model
 */
export function groupByModel(results: EvalMetrics[]): Record<ModelProvider, AggregateMetrics> {
  const models: Record<string, EvalMetrics[]> = {};

  // Group results
  for (const result of results) {
    if (!models[result.model]) {
      models[result.model] = [];
    }
    models[result.model].push(result);
  }

  // Calculate metrics for each model
  const modelMetrics: Record<ModelProvider, AggregateMetrics> = {} as any;
  for (const [model, modelResults] of Object.entries(models)) {
    modelMetrics[model as ModelProvider] = calculateAggregateMetrics(modelResults);
  }

  return modelMetrics;
}

/**
 * Compare two models side-by-side
 */
export function compareModels(results: EvalMetrics[], models: ModelProvider[]): ModelComparison {
  const modelMetrics = groupByModel(results);

  // Filter to requested models
  const filteredMetrics: Record<ModelProvider, AggregateMetrics> = {} as any;
  for (const model of models) {
    if (modelMetrics[model]) {
      filteredMetrics[model] = modelMetrics[model];
    }
  }

  // Determine winners by metric
  const winner = determineWinners(filteredMetrics, models);

  return {
    models,
    metrics: filteredMetrics,
    winner
  };
}

/**
 * Determine which model wins in each category
 */
function determineWinners(
  metrics: Record<ModelProvider, AggregateMetrics>,
  models: ModelProvider[]
): ModelComparison['winner'] {
  if (models.length === 0) {
    return {
      overall: 'openai',
      byMetric: {
        passRate: 'openai',
        avgScore: 'openai',
        latency: 'openai',
        toolSuccess: 'openai',
        reliability: 'openai'
      }
    };
  }

  // Find best in each metric
  let bestPassRate: ModelProvider = models[0];
  let bestScore: ModelProvider = models[0];
  let bestLatency: ModelProvider = models[0];
  let bestToolSuccess: ModelProvider = models[0];
  let bestReliability: ModelProvider = models[0];

  for (const model of models) {
    const m = metrics[model];
    if (!m) continue;

    if (m.passRate > metrics[bestPassRate]?.passRate) bestPassRate = model;
    if (m.avgScore > metrics[bestScore]?.avgScore) bestScore = model;
    if (m.avgLatency < metrics[bestLatency]?.avgLatency) bestLatency = model;
    if (m.toolCallSuccessRate > metrics[bestToolSuccess]?.toolCallSuccessRate) bestToolSuccess = model;
    if ((1 - m.errorRate) > (1 - (metrics[bestReliability]?.errorRate || 0))) bestReliability = model;
  }

  // Calculate overall winner (weighted score)
  let overallWinner: ModelProvider = models[0];
  let highestOverallScore = 0;

  for (const model of models) {
    const m = metrics[model];
    if (!m) continue;

    // Weighted overall score
    const overallScore =
      m.passRate * 40 +                      // 40% weight
      (m.avgScore / 100) * 30 +              // 30% weight
      ((1 - m.errorRate) * 20) +             // 20% weight
      (m.toolCallSuccessRate * 10);          // 10% weight

    if (overallScore > highestOverallScore) {
      highestOverallScore = overallScore;
      overallWinner = model;
    }
  }

  return {
    overall: overallWinner,
    byMetric: {
      passRate: bestPassRate,
      avgScore: bestScore,
      latency: bestLatency,
      toolSuccess: bestToolSuccess,
      reliability: bestReliability
    }
  };
}

/**
 * Filter results by category
 */
export function filterByCategory(results: EvalMetrics[], category: string): EvalMetrics[] {
  return results.filter(r => r.category === category);
}

/**
 * Filter results by model
 */
export function filterByModel(results: EvalMetrics[], model: ModelProvider): EvalMetrics[] {
  return results.filter(r => r.model === model);
}

/**
 * Get summary statistics
 */
export function getSummary(results: EvalMetrics[]): {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgScore: number;
  avgLatency: number;
} {
  const passed = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: calculatePassRate(results),
    avgScore: calculateAverageScore(results),
    avgLatency: calculateAverageLatency(results)
  };
}
