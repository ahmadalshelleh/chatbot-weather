import { ChatRepository } from '../repositories/chat.repository';
import { SessionRepository } from '../repositories/session.repository';
import { LLMFactory } from '../services/llm/llm.factory';
import { executeTool, TOOLS } from '../services/tools.service';
import { Message, ModelProvider, LLMResponse } from '../types';
import { RouterService } from './router.service';
import { OrchestratorResponse, ModelExecutionResult } from './routing.types';

export class OrchestratorService {
  private chatRepository: ChatRepository;
  private sessionRepository: SessionRepository;
  private router: RouterService;

  constructor() {
    this.chatRepository = new ChatRepository();
    this.sessionRepository = new SessionRepository();
    this.router = new RouterService();
  }

  /**
   * Process chat with intelligent routing and fallback
   * Now accepts a single user message and loads history from database
   */
  async processChat(
    userMessage: string,
    sessionId: string,
    maxIterations: number = 5
  ): Promise<OrchestratorResponse> {
    // Load conversation history from database
    const history = await this.sessionRepository.getSessionHistory(sessionId);

    // Create user message object
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    // Save user message to session
    await this.sessionRepository.appendMessage(sessionId, newUserMessage);

    // Combine history with new message
    const messages = [...history, newUserMessage];

    // Step 1: Route the request
    const routingDecision = await this.router.routeRequest({
      userMessage: userMessage,
      conversationHistory: messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content || ''
      })),
      availableModels: ['openai', 'deepseek']
    });

    console.log(`🎯 Routing Decision: ${routingDecision.model} (confidence: ${routingDecision.confidence})`);
    console.log(`   Reasoning: ${routingDecision.reasoning}`);

    // Step 2: Try primary model
    let executionResult = await this.executeWithModel(
      messages,
      routingDecision.model,
      sessionId,
      maxIterations
    );

    // Step 3: Fallback if primary model fails
    if (!executionResult.success && routingDecision.fallbackModel) {
      console.log(`⚠️  Primary model (${routingDecision.model}) failed, falling back to ${routingDecision.fallbackModel}`);

      executionResult = await this.executeWithModel(
        messages,
        routingDecision.fallbackModel,
        sessionId,
        maxIterations
      );

      executionResult.fallbackUsed = true;
      executionResult.fallbackModel = routingDecision.fallbackModel;
    }

    // Step 4: Return response with model info
    const modelUsed = executionResult.fallbackUsed
      ? executionResult.fallbackModel!
      : routingDecision.model;

    return {
      response: executionResult.response?.response || 'Sorry, I encountered an error processing your request.',
      toolCallsMade: executionResult.response?.toolCallsMade || [],
      modelUsed: modelUsed,
      modelDisplayName: this.router.getModelDisplayName(modelUsed),
      fallbackUsed: executionResult.fallbackUsed,
      routingReasoning: routingDecision.reasoning
    };
  }

  /**
   * Execute chat with a specific model
   */
  private async executeWithModel(
    messages: Message[],
    model: ModelProvider,
    sessionId: string,
    maxIterations: number
  ): Promise<ModelExecutionResult> {
    try {
      const llmService = LLMFactory.create(model);
      const conversationMessages: Message[] = [...messages];
      const toolCallsMade: any[] = [];

      // Agent loop for tool calling
      for (let i = 0; i < maxIterations; i++) {
        const response = await llmService.chat(conversationMessages, TOOLS);

        // If no tool calls, save and return final response
        if (response.toolCalls.length === 0) {
          // Save to legacy chat repository (for analytics)
          await this.chatRepository.create({
            sessionId,
            model: model,
            messages: conversationMessages,
            toolCallsMade
          });

          // Save assistant message to session
          const assistantMessage: Message = {
            role: 'assistant',
            content: response.content || 'No response generated',
            timestamp: new Date(),
            modelUsed: model,
            modelDisplayName: this.router.getModelDisplayName(model)
          };
          await this.sessionRepository.appendMessage(sessionId, assistantMessage);

          return {
            success: true,
            model,
            response: {
              response: response.content || 'No response generated',
              toolCallsMade,
              modelUsed: model
            },
            fallbackUsed: false
          };
        }

        // Add assistant message with tool calls
        conversationMessages.push({
          role: 'assistant',
          content: null,
          toolCalls: response.toolCalls
        });

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          toolCallsMade.push({
            name: toolCall.name,
            arguments: toolCall.arguments,
            timestamp: new Date()
          });

          const toolResult = await executeTool(toolCall.name, toolCall.arguments);

          // Add tool result
          conversationMessages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }
      }

      // Max iterations reached
      await this.chatRepository.create({
        sessionId,
        model: model,
        messages: conversationMessages,
        toolCallsMade
      });

      return {
        success: true,
        model,
        response: {
          response: 'Max iterations reached',
          toolCallsMade,
          modelUsed: model
        },
        fallbackUsed: false
      };

    } catch (error: any) {
      console.error(`Model ${model} execution error:`, error.message);
      return {
        success: false,
        model,
        error: error.message,
        fallbackUsed: false
      };
    }
  }

  /**
   * Process chat with streaming and intelligent routing
   * Now accepts a single user message and loads history from database
   */
  async *processChatStream(
    userMessage: string,
    sessionId: string,
    maxIterations: number = 5
  ): AsyncGenerator<{ type: 'content' | 'tool' | 'done' | 'routing', data: any }, void, unknown> {
    // Load conversation history from database
    const history = await this.sessionRepository.getSessionHistory(sessionId);

    // Create user message object
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    // Save user message to session
    await this.sessionRepository.appendMessage(sessionId, newUserMessage);

    // Combine history with new message
    const messages = [...history, newUserMessage];

    // Step 1: Route the request
    const routingDecision = await this.router.routeRequest({
      userMessage: userMessage,
      conversationHistory: messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content || ''
      })),
      availableModels: ['openai', 'deepseek']
    });

    console.log(`🎯 Routing Decision: ${routingDecision.model} (confidence: ${routingDecision.confidence})`);

    // Emit routing decision
    yield {
      type: 'routing',
      data: {
        model: routingDecision.model,
        modelDisplayName: this.router.getModelDisplayName(routingDecision.model),
        reasoning: routingDecision.reasoning,
        confidence: routingDecision.confidence
      }
    };

    // Step 2: Try streaming with primary model
    try {
      yield* this.streamWithModel(messages, routingDecision.model, sessionId, maxIterations, false, routingDecision.reasoning);
    } catch (error: any) {
      console.error(`Primary model failed:`, error.message);

      // Step 3: Fallback to secondary model
      if (routingDecision.fallbackModel) {
        console.log(`Falling back to ${routingDecision.fallbackModel}`);

        yield {
          type: 'routing',
          data: {
            model: routingDecision.fallbackModel,
            modelDisplayName: this.router.getModelDisplayName(routingDecision.fallbackModel),
            reasoning: `Fallback from ${routingDecision.model} due to error`,
            confidence: 1.0,
            fallbackUsed: true
          }
        };

        yield* this.streamWithModel(messages, routingDecision.fallbackModel, sessionId, maxIterations, true, 'Fallback model');
      }
    }
  }

  /**
   * Stream with a specific model
   */
  private async *streamWithModel(
    messages: Message[],
    model: ModelProvider,
    sessionId: string,
    maxIterations: number,
    fallbackUsed: boolean,
    routingReasoning: string
  ): AsyncGenerator<{ type: 'content' | 'tool' | 'done', data: any }, void, unknown> {
    const llmService = LLMFactory.create(model);
    const conversationMessages: Message[] = [...messages];
    const toolCallsMade: any[] = [];

    // Agent loop for tool calling
    for (let i = 0; i < maxIterations; i++) {
      const streamGen = llmService.chatStream(conversationMessages, TOOLS);
      let finalResponse: LLMResponse | null = null;

      // Stream content chunks
      while (true) {
        const result = await streamGen.next();

        if (result.done) {
          finalResponse = result.value as LLMResponse;
          break;
        } else {
          yield { type: 'content', data: result.value };
        }
      }

      if (!finalResponse) break;

      // If no tool calls, we're done
      if (finalResponse.toolCalls.length === 0) {
        // Save to legacy chat repository (for analytics)
        await this.chatRepository.create({
          sessionId,
          model: model,
          messages: conversationMessages,
          toolCallsMade
        });

        // Save assistant message to session
        const assistantMessage: Message = {
          role: 'assistant',
          content: finalResponse.content || 'No response generated',
          timestamp: new Date(),
          modelUsed: model,
          modelDisplayName: this.router.getModelDisplayName(model),
          fallbackUsed
        };
        await this.sessionRepository.appendMessage(sessionId, assistantMessage);

        yield {
          type: 'done',
          data: {
            response: finalResponse.content || 'No response generated',
            toolCallsMade,
            modelUsed: model,
            modelDisplayName: this.router.getModelDisplayName(model),
            fallbackUsed,
            routingReasoning
          }
        };
        return;
      }

      // Add assistant message with tool calls
      conversationMessages.push({
        role: 'assistant',
        content: null,
        toolCalls: finalResponse.toolCalls
      });

      // Execute each tool call
      for (const toolCall of finalResponse.toolCalls) {
        toolCallsMade.push({
          name: toolCall.name,
          arguments: toolCall.arguments,
          timestamp: new Date()
        });

        yield {
          type: 'tool',
          data: {
            name: toolCall.name,
            arguments: toolCall.arguments
          }
        };

        const toolResult = await executeTool(toolCall.name, toolCall.arguments);

        conversationMessages.push({
          role: 'tool',
          toolCallId: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }
    }

    // Max iterations reached
    await this.chatRepository.create({
      sessionId,
      model: model,
      messages: conversationMessages,
      toolCallsMade
    });

    yield {
      type: 'done',
      data: {
        response: 'Max iterations reached',
        toolCallsMade,
        modelUsed: model,
        modelDisplayName: this.router.getModelDisplayName(model),
        fallbackUsed,
        routingReasoning
      }
    };
  }
}
