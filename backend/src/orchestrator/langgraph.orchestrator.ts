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
   * Process chat with streaming using LangGraph's stream mode
   */
  async *processChatStream(
    userMessage: string,
    sessionId: string,
    maxIterations: number = 5
  ): AsyncGenerator<{ type: 'content' | 'tool' | 'done' | 'routing' | 'node', data: any }, void, unknown> {
    console.log('\n🚀 Starting LangGraph streaming orchestration...');
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

      let routingEmitted = false;
      let lastState: GraphStateType | null = null;

      // Stream the graph execution with updates mode to track node transitions
      const stream = await this.graph.stream(initialState, {
        streamMode: 'updates' // Stream only updates/changes
      });

      let previousToolCallCount = 0;

      for await (const update of stream) {
        // update is an object with node name as key and state changes as value
        const nodeName = Object.keys(update)[0];
        const stateChanges = update[nodeName] as Partial<GraphStateType>;

        console.log(`📍 Node: ${nodeName}`);

        // Merge state changes
        if (!lastState) {
          lastState = { ...(initialState as any), ...(stateChanges as any) } as GraphStateType;
        } else {
          lastState = { ...(lastState as any), ...(stateChanges as any) } as GraphStateType;
        }

        // Emit node progress
        yield {
          type: 'node',
          data: {
            node: nodeName,
            timestamp: new Date()
          }
        };

        // Emit routing decision when available
        if (!routingEmitted && stateChanges.selectedModel && stateChanges.routingReasoning) {
          yield {
            type: 'routing',
            data: {
              model: stateChanges.selectedModel,
              modelDisplayName: this.router.getModelDisplayName(stateChanges.selectedModel),
              reasoning: stateChanges.routingReasoning,
              confidence: stateChanges.routingConfidence || 0
            }
          };
          routingEmitted = true;
        }

        // Emit tool calls when new ones are added
        if (stateChanges.toolCallsMade && stateChanges.toolCallsMade.length > 0) {
          const newToolCalls = stateChanges.toolCallsMade.slice(previousToolCallCount);
          for (const toolCall of newToolCalls) {
            yield {
              type: 'tool',
              data: {
                name: toolCall.name,
                arguments: toolCall.arguments
              }
            };
          }
          previousToolCallCount = stateChanges.toolCallsMade.length;
        }

        // Emit final response when available
        if (stateChanges.finalResponse) {
          yield {
            type: 'content',
            data: stateChanges.finalResponse
          };
        }
      }

      // Emit done event with final state
      if (lastState) {
        const modelUsed = lastState.selectedModel || 'openai';

        console.log('\n✅ LangGraph streaming complete');
        console.log(`   Model used: ${modelUsed}`);
        console.log(`   Fallback used: ${lastState.fallbackUsed}`);
        console.log(`   Tool calls: ${lastState.toolCallsMade.length}`);

        yield {
          type: 'done',
          data: {
            response: lastState.finalResponse || 'No response generated',
            toolCallsMade: lastState.toolCallsMade,
            modelUsed,
            modelDisplayName: this.router.getModelDisplayName(modelUsed),
            fallbackUsed: lastState.fallbackUsed,
            routingReasoning: lastState.routingReasoning
          }
        };
      }

    } catch (error: any) {
      console.error('❌ LangGraph streaming error:', error);

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
