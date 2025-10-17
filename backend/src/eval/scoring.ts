import { ModelProvider } from '../types';

export interface ScoringInput {
  // Test case expectations
  expectedModel?: ModelProvider;
  expectedTools?: string[];
  expectedKeywords?: string[];
  maxLatencyMs?: number;

  // Actual results
  actualModel: ModelProvider;
  actualTools: string[];
  response: string;
  latencyMs: number;
  routingConfidence: number;
  errorOccurred: boolean;
  fallbackUsed: boolean;
}

export interface ScoringResult {
  routingScore: number;      // 0-30
  qualityScore: number;       // 0-40
  performanceScore: number;   // 0-20
  reliabilityScore: number;   // 0-10
  totalScore: number;         // 0-100
  passed: boolean;            // true if >= 70
  breakdown: {
    routing: {
      modelCorrect: boolean;
      points: number;
    };
    routingConfidence: {
      isHigh: boolean;
      points: number;
    };
    toolsUsed: {
      correct: boolean;
      points: number;
    };
    keywordsFound: {
      count: number;
      percentage: number;
      points: number;
    };
    responseComplete: {
      isComplete: boolean;
      points: number;
    };
    latency: {
      underThreshold: boolean;
      points: number;
    };
    tokenEfficiency: {
      points: number;
    };
    noErrors: {
      hasNoErrors: boolean;
      points: number;
    };
    noFallback: {
      hasNoFallback: boolean;
      points: number;
    };
  };
}

/**
 * Calculate routing score (0-30 points)
 * - Correct model selection: 20 points
 * - High routing confidence (>0.7): 10 points
 */
export function calculateRoutingScore(input: ScoringInput): { score: number; breakdown: any } {
  let score = 0;
  const breakdown: any = {};

  // Model correctness (20 points)
  const modelCorrect = !input.expectedModel || input.actualModel === input.expectedModel;
  breakdown.modelCorrect = modelCorrect;
  breakdown.points = modelCorrect ? 20 : 0;
  score += breakdown.points;

  // Routing confidence (10 points)
  const confidenceHigh = input.routingConfidence > 0.7;
  const confidenceBreakdown = {
    isHigh: confidenceHigh,
    points: confidenceHigh ? 10 : Math.floor(input.routingConfidence * 10)
  };

  score += confidenceBreakdown.points;

  return {
    score,
    breakdown: {
      routing: breakdown,
      routingConfidence: confidenceBreakdown
    }
  };
}

/**
 * Calculate quality score (0-40 points)
 * - Expected tools used: 15 points
 * - Expected keywords found: 15 points
 * - Response completeness: 10 points
 */
export function calculateQualityScore(input: ScoringInput): { score: number; breakdown: any } {
  let score = 0;
  const breakdown: any = {};

  // Tools used (15 points)
  let toolsCorrect = true;
  if (input.expectedTools && input.expectedTools.length > 0) {
    toolsCorrect = input.expectedTools.every(tool => input.actualTools.includes(tool));
  } else if (input.expectedTools && input.expectedTools.length === 0) {
    // Should not use tools
    toolsCorrect = input.actualTools.length === 0;
  }

  breakdown.toolsUsed = {
    correct: toolsCorrect,
    points: toolsCorrect ? 15 : 0
  };
  score += breakdown.toolsUsed.points;

  // Keywords found (15 points)
  let keywordsFound = 0;
  let keywordsPercentage = 1.0;

  if (input.expectedKeywords && input.expectedKeywords.length > 0) {
    const responseLower = input.response.toLowerCase();
    keywordsFound = input.expectedKeywords.filter(keyword =>
      responseLower.includes(keyword.toLowerCase())
    ).length;
    keywordsPercentage = keywordsFound / input.expectedKeywords.length;
  }

  const keywordsPoints = Math.floor(keywordsPercentage * 15);
  breakdown.keywordsFound = {
    count: keywordsFound,
    percentage: keywordsPercentage,
    points: keywordsPoints
  };
  score += keywordsPoints;

  // Response completeness (10 points)
  const isComplete = input.response.length > 20 && !input.errorOccurred;
  breakdown.responseComplete = {
    isComplete,
    points: isComplete ? 10 : 0
  };
  score += breakdown.responseComplete.points;

  return { score, breakdown };
}

/**
 * Calculate performance score (0-20 points)
 * - Latency under threshold: 15 points
 * - Token efficiency: 5 points (placeholder)
 */
export function calculatePerformanceScore(input: ScoringInput): { score: number; breakdown: any } {
  let score = 0;
  const breakdown: any = {};

  // Latency (15 points)
  const threshold = input.maxLatencyMs || 5000;
  const underThreshold = input.latencyMs <= threshold;

  let latencyPoints = 0;
  if (underThreshold) {
    latencyPoints = 15;
  } else {
    // Partial credit if within 150% of threshold
    const ratio = threshold / input.latencyMs;
    if (ratio > 0.67) {
      latencyPoints = Math.floor(ratio * 15);
    }
  }

  breakdown.latency = {
    underThreshold,
    points: latencyPoints
  };
  score += latencyPoints;

  // Token efficiency (5 points) - placeholder for now
  // Could calculate based on response length / quality ratio
  const tokenPoints = 5; // Full points for now
  breakdown.tokenEfficiency = {
    points: tokenPoints
  };
  score += tokenPoints;

  return { score, breakdown };
}

/**
 * Calculate reliability score (0-10 points)
 * - No errors occurred: 5 points
 * - Fallback not needed: 5 points
 */
export function calculateReliabilityScore(input: ScoringInput): { score: number; breakdown: any } {
  let score = 0;
  const breakdown: any = {};

  // No errors (5 points)
  const noErrors = !input.errorOccurred;
  breakdown.noErrors = {
    hasNoErrors: noErrors,
    points: noErrors ? 5 : 0
  };
  score += breakdown.noErrors.points;

  // No fallback (5 points)
  const noFallback = !input.fallbackUsed;
  breakdown.noFallback = {
    hasNoFallback: noFallback,
    points: noFallback ? 5 : 0
  };
  score += breakdown.noFallback.points;

  return { score, breakdown };
}

/**
 * Calculate total score and determine pass/fail
 */
export function calculateTotalScore(input: ScoringInput): ScoringResult {
  const routing = calculateRoutingScore(input);
  const quality = calculateQualityScore(input);
  const performance = calculatePerformanceScore(input);
  const reliability = calculateReliabilityScore(input);

  const totalScore = routing.score + quality.score + performance.score + reliability.score;
  const passed = totalScore >= 70;

  return {
    routingScore: routing.score,
    qualityScore: quality.score,
    performanceScore: performance.score,
    reliabilityScore: reliability.score,
    totalScore,
    passed,
    breakdown: {
      ...routing.breakdown,
      ...quality.breakdown,
      ...performance.breakdown,
      ...reliability.breakdown
    }
  };
}

/**
 * Helper to check if a test passed
 */
export function isPassed(score: number): boolean {
  return score >= 70;
}
