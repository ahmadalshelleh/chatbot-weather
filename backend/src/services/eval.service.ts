import * as fs from 'fs';
import * as path from 'path';
import { ModelProvider } from '../types';
import { LangGraphOrchestrator } from '../orchestrator/langgraph.orchestrator';
import { EvalRepository } from '../repositories/eval.repository';
import {
  calculateTotalScore,
  ScoringInput,
  ScoringResult
} from '../eval/scoring';
import {
  EvalMetrics,
  groupByCategory,
  groupByModel,
  compareModels,
  AggregateMetrics,
  CategoryMetrics,
  ModelComparison
} from '../eval/metrics';

export interface TestCase {
  id: string;
  category: string;
  description: string;
  input: string;
  expectedModel?: ModelProvider;
  expectedTools?: string[];
  expectedKeywords?: string[];
  maxLatencyMs?: number;
  metadata?: Record<string, any>;
}

export interface TestCasesFile {
  version: string;
  description: string;
  testCases: TestCase[];
}

export interface EvalConfig {
  models?: ModelProvider[];  // Models to test, default: all
  categories?: string[];      // Categories to test, default: all
  iterations?: number;        // Run each test N times, default: 1
  testIds?: string[];        // Specific test IDs to run
}

export interface EvalReport {
  reportId: string;
  timestamp: Date;
  config: EvalConfig;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    avgScore: number;
    avgLatency: number;
  };
  byModel: Record<ModelProvider, AggregateMetrics>;
  byCategory: Record<string, CategoryMetrics>;
  detailedResults: EvalMetrics[];
  comparison?: ModelComparison;
}

export class EvalService {
  private orchestrator: LangGraphOrchestrator;
  private evalRepository: EvalRepository;
  private testCases: TestCase[];

  constructor() {
    this.orchestrator = new LangGraphOrchestrator();
    this.evalRepository = new EvalRepository();
    this.testCases = this.loadTestCases();
  }

  /**
   * Load test cases from JSON file
   */
  private loadTestCases(): TestCase[] {
    try {
      const testCasesPath = path.join(__dirname, '../eval/test-cases.json');
      const fileContent = fs.readFileSync(testCasesPath, 'utf-8');
      const testCasesFile: TestCasesFile = JSON.parse(fileContent);
      console.log(`📋 Loaded ${testCasesFile.testCases.length} test cases`);
      return testCasesFile.testCases;
    } catch (error: any) {
      console.error('Failed to load test cases:', error.message);
      return [];
    }
  }

  /**
   * Run full evaluation suite
   */
  async runEvaluation(config: EvalConfig = {}): Promise<EvalReport> {
    console.log('🚀 Starting evaluation...');
    console.log('Config:', config);

    const {
      models = ['openai', 'deepseek'],
      categories,
      iterations = 1,
      testIds
    } = config;

    // Filter test cases
    let selectedTests = this.testCases;

    if (testIds && testIds.length > 0) {
      selectedTests = selectedTests.filter(tc => testIds.includes(tc.id));
    }

    if (categories && categories.length > 0) {
      selectedTests = selectedTests.filter(tc => categories.includes(tc.category));
    }

    if (selectedTests.length === 0) {
      throw new Error('No test cases selected');
    }

    console.log(`📊 Running ${selectedTests.length} tests across ${models.length} model(s)`);

    // Run tests
    const allResults: EvalMetrics[] = [];

    for (const model of models) {
      console.log(`\n🤖 Testing model: ${model}`);

      for (const testCase of selectedTests) {
        for (let i = 0; i < iterations; i++) {
          const iterationLabel = iterations > 1 ? ` (iteration ${i + 1}/${iterations})` : '';
          console.log(`  ⏳ Running test: ${testCase.id}${iterationLabel}`);

          try {
            const result = await this.runSingleTest(testCase, model);
            allResults.push(result);

            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`     ${status} | Score: ${result.score}/100 | Latency: ${result.latencyMs}ms`);
          } catch (error: any) {
            console.error(`     ❌ ERROR: ${error.message}`);
            // Add failed result
            allResults.push(this.createErrorResult(testCase, model, error.message));
          }
        }
      }
    }

    // Generate report
    const report = this.generateReport(allResults, config);

    // Save results to database
    await this.saveResults(allResults, report.reportId);

    console.log('\n✨ Evaluation complete!');
    console.log(`📈 Pass Rate: ${(report.summary.passRate * 100).toFixed(1)}%`);
    console.log(`📊 Avg Score: ${report.summary.avgScore.toFixed(1)}/100`);

    return report;
  }

  /**
   * Run a single test case
   */
  async runSingleTest(testCase: TestCase, model: ModelProvider): Promise<EvalMetrics> {
    const startTime = Date.now();
    const sessionId = `eval-${testCase.id}-${Date.now()}`;

    let response = '';
    let toolsCalled: string[] = [];
    let actualModel: ModelProvider = model;
    let routingConfidence = 0;
    let fallbackUsed = false;
    let errorOccurred = false;
    let errorMessage = '';

    try {
      // Run test through orchestrator
      const result = await this.orchestrator.processChat(
        testCase.input,
        sessionId,
        5 // maxIterations
      );

      response = result.response || '';
      toolsCalled = (result.toolCallsMade || []).map((tc: any) => tc.name);
      actualModel = result.modelUsed || model;
      fallbackUsed = result.fallbackUsed || false;

      // Note: We don't have direct access to routing confidence here
      // In a real scenario, you'd modify orchestrator to return this
      routingConfidence = 0.8; // Default

    } catch (error: any) {
      errorOccurred = true;
      errorMessage = error.message;
      response = `Error: ${error.message}`;
    }

    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    // Calculate score
    const scoringInput: ScoringInput = {
      expectedModel: testCase.expectedModel,
      expectedTools: testCase.expectedTools,
      expectedKeywords: testCase.expectedKeywords,
      maxLatencyMs: testCase.maxLatencyMs,
      actualModel,
      actualTools: toolsCalled,
      response,
      latencyMs,
      routingConfidence,
      errorOccurred,
      fallbackUsed
    };

    const scoringResult: ScoringResult = calculateTotalScore(scoringInput);

    // Create eval metrics
    const evalMetrics: EvalMetrics = {
      testId: testCase.id,
      model: actualModel,
      category: testCase.category,
      passed: scoringResult.passed,
      score: scoringResult.totalScore,
      latencyMs,
      toolsCalled,
      toolCallCount: toolsCalled.length,
      response,
      errorOccurred,
      fallbackUsed,
      routingConfidence,
      scoringResult,
      timestamp: new Date()
    };

    return evalMetrics;
  }

  /**
   * Create error result when test throws exception
   */
  private createErrorResult(
    testCase: TestCase,
    model: ModelProvider,
    errorMessage: string
  ): EvalMetrics {
    const scoringResult: ScoringResult = {
      routingScore: 0,
      qualityScore: 0,
      performanceScore: 0,
      reliabilityScore: 0,
      totalScore: 0,
      passed: false,
      breakdown: {} as any
    };

    return {
      testId: testCase.id,
      model,
      category: testCase.category,
      passed: false,
      score: 0,
      latencyMs: 0,
      toolsCalled: [],
      toolCallCount: 0,
      response: `Error: ${errorMessage}`,
      errorOccurred: true,
      fallbackUsed: false,
      routingConfidence: 0,
      scoringResult,
      timestamp: new Date()
    };
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(results: EvalMetrics[], config: EvalConfig): EvalReport {
    const reportId = `eval-report-${Date.now()}`;

    // Calculate summary
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const avgScore = totalTests > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / totalTests
      : 0;
    const avgLatency = totalTests > 0
      ? Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / totalTests)
      : 0;

    // Group by model and category
    const byModel = groupByModel(results);
    const byCategory = groupByCategory(results);

    // Generate comparison if multiple models
    const models = [...new Set(results.map(r => r.model))];
    const comparison = models.length > 1
      ? compareModels(results, models)
      : undefined;

    return {
      reportId,
      timestamp: new Date(),
      config,
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        passRate: totalTests > 0 ? passedTests / totalTests : 0,
        avgScore,
        avgLatency
      },
      byModel,
      byCategory,
      detailedResults: results,
      comparison
    };
  }

  /**
   * Save evaluation results to database
   */
  private async saveResults(results: EvalMetrics[], reportId: string): Promise<void> {
    console.log(`💾 Saving ${results.length} results to database...`);

    for (const result of results) {
      try {
        await this.evalRepository.create({
          testId: result.testId,
          model: result.model,
          passed: result.passed,
          score: result.score,
          latencyMs: result.latencyMs,
          toolsCalled: result.toolsCalled,
          toolCallCount: result.toolCallCount,
          response: result.response,
          errors: result.errorOccurred ? ['Test execution error'] : [],
          metadata: {
            reportId,
            category: result.category,
            fallbackUsed: result.fallbackUsed,
            routingConfidence: result.routingConfidence,
            scoringBreakdown: result.scoringResult.breakdown
          }
        });
      } catch (error: any) {
        console.error(`Failed to save result for ${result.testId}:`, error.message);
      }
    }

    console.log('✅ Results saved');
  }

  /**
   * Get all test cases
   */
  getTestCases(): TestCase[] {
    return this.testCases;
  }

  /**
   * Get test case by ID
   */
  getTestCase(testId: string): TestCase | undefined {
    return this.testCases.find(tc => tc.id === testId);
  }

  /**
   * Get test cases by category
   */
  getTestCasesByCategory(category: string): TestCase[] {
    return this.testCases.filter(tc => tc.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return [...new Set(this.testCases.map(tc => tc.category))];
  }
}
