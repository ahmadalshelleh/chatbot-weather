import { StateGraph, END } from '@langchain/langgraph';
import { GraphState, GraphStateType } from './langgraph.state';
import {
  loadHistoryNode,
  saveUserMessageNode,
  routeRequestNode,
  executeModelNode,
  executeToolsNode,
  fallbackModelNode,
  saveFinalResponseNode
} from './langgraph.nodes';
import { OrchestratorResponse } from './routing.types';
import { RouterService } from './router.service';

/**
 * LangGraph-based Orchestrator
 * Uses a graph structure to manage conversation flow with routing, tool calling, and fallback logic
 */
export class LangGraphOrchestrator {
  private graph: ReturnType<typeof this.buildGraph>;
  private router: RouterService;

  constructor() {
    this.router = new RouterService();
    this.graph = this.buildGraph();
  }

  /**
   * Build the conversation flow graph
   */
  private buildGraph() {
    const workflow = new StateGraph(GraphState)
      // Add all nodes
      .addNode('load_history', loadHistoryNode)
      .addNode('save_user_message', saveUserMessageNode)
      .addNode('route_request', routeRequestNode)
      .addNode('execute_model', executeModelNode)
      .addNode('execute_tools', executeToolsNode)
      .addNode('fallback_model', fallbackModelNode)
      .addNode('save_response', saveFinalResponseNode)

      // Define the flow
      .addEdge('__start__', 'load_history')
      .addEdge('load_history', 'save_user_message')
      .addEdge('save_user_message', 'route_request')
      .addEdge('route_request', 'execute_model')

      // Conditional: After model execution, check for tools or errors
      .addConditionalEdges(
        'execute_model',
        this.shouldContinueAfterModel,
        {
          execute_tools: 'execute_tools',
          fallback: 'fallback_model',
          save: 'save_response'
        }
      )

      // After executing tools, go back to model or finish
      .addConditionalEdges(
        'execute_tools',
        this.shouldContinueAfterTools,
        {
          execute_model: 'execute_model',
          save: 'save_response'
        }
      )

      // After fallback or saving, end the flow
      .addEdge('fallback_model', 'save_response')
      .addEdge('save_response', END);

    return workflow.compile();
  }

  /**
   * Conditional edge: Decide what to do after model execution
   */
  private shouldContinueAfterModel(state: GraphStateType): string {
    // If there's an error and we have a fallback model, use it
    if (state.error && state.fallbackModel && !state.fallbackUsed) {
      return 'fallback';
    }

    // If we have a final response, save it
    if (state.finalResponse) {
      return 'save';
    }

    // If last message has tool calls, execute them
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?.toolCalls && lastMessage.toolCalls.length > 0) {
      return 'execute_tools';
    }

    // Default: save
    return 'save';
  }

  /**
   * Conditional edge: Decide what to do after tool execution
   */
  private shouldContinueAfterTools(state: GraphStateType): string {
    // Check if we've hit max iterations
    if (state.iterationCount >= state.maxIterations) {
      console.log('⚠️  Max iterations reached');
      return 'save';
    }

    // Continue the agent loop
    return 'execute_model';
  }

  /**
   * Process chat using LangGraph
   */
  async processChat(
    userMessage: string,
    sessionId: string,
    maxIterations: number = 5
  ): Promise<OrchestratorResponse> {
    console.log('\n🚀 Starting LangGraph orchestration...');
    console.log(`   Session: ${sessionId}`);
    console.log(`   Message: ${userMessage.substring(0, 50)}...`);

    try {
      // Initialize state
      const initialState: Partial<GraphStateType> = {
        userMessage,
        sessionId,
        maxIterations,
        messages: [],
        toolCallsMade: [],
        iterationCount: 0,
        fallbackUsed: false
      };

      // Run the graph
      const finalState = await this.graph.invoke(initialState);

      // Extract results
      const modelUsed = finalState.selectedModel || 'openai';
      const response = finalState.finalResponse || 'Sorry, I encountered an error processing your request.';

      console.log('\n✅ LangGraph orchestration complete');
      console.log(`   Model used: ${modelUsed}`);
      console.log(`   Fallback used: ${finalState.fallbackUsed}`);
      console.log(`   Tool calls: ${finalState.toolCallsMade.length}`);

      return {
        response,
        toolCallsMade: finalState.toolCallsMade,
        modelUsed,
        modelDisplayName: this.router.getModelDisplayName(modelUsed),
        fallbackUsed: finalState.fallbackUsed,
        routingReasoning: finalState.routingReasoning
      };

    } catch (error: any) {
      console.error('❌ LangGraph orchestration error:', error);

      return {
        response: 'Sorry, I encountered an error processing your request.',
        toolCallsMade: [],
        modelUsed: 'openai',
        modelDisplayName: 'GPT-3.5 Turbo',
        fallbackUsed: false,
        routingReasoning: `Error: ${error.message}`
      };
    }
  }

  /**
   * Process chat with streaming - simplified approach
   * Since LangGraph nodes execute synchronously, we run the full graph
   * and emit progress events at key milestones
   */
  async *processChatStream(
    userMessage: string,
    sessionId: string,
    maxIterations: number = 5
  ): AsyncGenerator<{ type: 'content' | 'tool' | 'done' | 'routing' | 'progress', data: any }, void, unknown> {
    console.log('\n🚀 Starting LangGraph streaming orchestration...');
    console.log(`   Session: ${sessionId}`);
    console.log(`   Message: ${userMessage.substring(0, 50)}...`);

    try {
      // Emit start event
      yield {
        type: 'progress',
        data: { stage: 'starting', message: 'Initializing...' }
      };

      // Initialize state
      const initialState: Partial<GraphStateType> = {
        userMessage,
        sessionId,
        maxIterations,
        messages: [],
        toolCallsMade: [],
        iterationCount: 0,
        fallbackUsed: false
      };

      // Emit loading history
      yield {
        type: 'progress',
        data: { stage: 'loading', message: 'Loading conversation history...' }
      };

      // Use streamMode: 'values' to get full state at each step
      const streamGenerator = await this.graph.stream(initialState, {
        streamMode: 'values'
      });

      let finalState: GraphStateType | null = null;
      let routingEmitted = false;
      let previousToolCount = 0;
      let lastEmittedContent = '';

      for await (const state of streamGenerator) {
        finalState = state as GraphStateType;

        console.log(`📊 Stream update - keys: ${Object.keys(state).join(', ')}`);

        // Emit routing once available
        if (!routingEmitted && finalState.selectedModel) {
          console.log(`🎯 Emitting routing: ${finalState.selectedModel}`);

          yield {
            type: 'routing',
            data: {
              model: finalState.selectedModel,
              modelDisplayName: this.router.getModelDisplayName(finalState.selectedModel),
              reasoning: finalState.routingReasoning || 'Model selected',
              confidence: finalState.routingConfidence || 1.0
            }
          };
          routingEmitted = true;

          yield {
            type: 'progress',
            data: {
              stage: 'executing',
              message: `Processing with ${this.router.getModelDisplayName(finalState.selectedModel)}...`
            }
          };
        }

        // Emit new tool calls
        if (finalState.toolCallsMade && finalState.toolCallsMade.length > previousToolCount) {
          const newTools = finalState.toolCallsMade.slice(previousToolCount);

          for (const tool of newTools) {
            console.log(`🔧 Emitting tool: ${tool.name}`);

            yield {
              type: 'tool',
              data: {
                name: tool.name,
                arguments: tool.arguments
              }
            };

            yield {
              type: 'progress',
              data: { stage: 'tool', message: `Calling ${tool.name}...` }
            };
          }

          previousToolCount = finalState.toolCallsMade.length;
        }

        // Emit content when available - simulate streaming by chunking
        if (finalState.finalResponse && finalState.finalResponse !== lastEmittedContent) {
          console.log(`✅ Emitting content`);

          // Split by words and emit word by word for smooth streaming effect
          const words = finalState.finalResponse.split(' ');
          let accumulatedContent = '';

          for (let i = 0; i < words.length; i++) {
            accumulatedContent += (i > 0 ? ' ' : '') + words[i];

            yield {
              type: 'content',
              data: accumulatedContent
            };

            // Small delay for smooth streaming appearance
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          lastEmittedContent = finalState.finalResponse;
        }
      }

      // Emit final done event
      if (finalState) {
        const modelUsed = finalState.selectedModel || 'openai';

        console.log('\n✅ LangGraph streaming complete');
        console.log(`   Model: ${modelUsed}, Tools: ${finalState.toolCallsMade?.length || 0}`);

        yield {
          type: 'done',
          data: {
            response: finalState.finalResponse || 'No response generated',
            toolCallsMade: finalState.toolCallsMade || [],
            modelUsed,
            modelDisplayName: this.router.getModelDisplayName(modelUsed),
            fallbackUsed: finalState.fallbackUsed || false,
            routingReasoning: finalState.routingReasoning || ''
          }
        };
      }

    } catch (error: any) {
      console.error('❌ LangGraph streaming error:', error);
      console.error(error.stack);

      yield {
        type: 'done',
        data: {
          response: 'Sorry, I encountered an error processing your request.',
          toolCallsMade: [],
          modelUsed: 'openai',
          modelDisplayName: 'GPT-3.5 Turbo',
          fallbackUsed: false,
          routingReasoning: `Error: ${error.message}`
        }
      };
    }
  }
}
