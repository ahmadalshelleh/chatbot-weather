import { GraphStateType } from './langgraph.state';
import { RouterService } from './router.service';
import { LLMFactory } from '../services/llm/llm.factory';
import { executeTool, TOOLS } from '../services/tools.service';
import { SessionRepository } from '../repositories/session.repository';
import { ChatRepository } from '../repositories/chat.repository';
import { Message } from '../types';

const router = new RouterService();
const sessionRepo = new SessionRepository();
const chatRepo = new ChatRepository();

/**
 * Node: Load conversation history from database
 */
export async function loadHistoryNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('📖 Loading conversation history...');

  const history = await sessionRepo.getSessionHistory(state.sessionId);

  return {
    messages: history
  };
}

/**
 * Node: Save user message to database
 */
export async function saveUserMessageNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('💾 Saving user message...');

  const userMessage: Message = {
    role: 'user',
    content: state.userMessage,
    timestamp: new Date()
  };

  await sessionRepo.appendMessage(state.sessionId, userMessage);

  return {
    messages: [userMessage]
  };
}

/**
 * Node: Route the request to appropriate model
 */
export async function routeRequestNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('🎯 Routing request...');

  const routingDecision = await router.routeRequest({
    userMessage: state.userMessage,
    conversationHistory: state.messages.slice(-5).map(m => ({
      role: m.role,
      content: m.content || ''
    })),
    availableModels: ['openai', 'deepseek']
  });

  console.log(`   Selected: ${routingDecision.model} (${routingDecision.confidence} confidence)`);
  console.log(`   Reasoning: ${routingDecision.reasoning}`);

  return {
    selectedModel: routingDecision.model,
    routingReasoning: routingDecision.reasoning,
    routingConfidence: routingDecision.confidence,
    fallbackModel: routingDecision.fallbackModel
  };
}

/**
 * Node: Execute with the selected model
 */
export async function executeModelNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  if (!state.selectedModel) {
    return {
      error: 'No model selected',
      finalResponse: 'Error: No model was selected for execution'
    };
  }

  console.log(`🤖 Executing with model: ${state.selectedModel}`);

  try {
    const llmService = LLMFactory.create(state.selectedModel);
    const response = await llmService.chat(state.messages, TOOLS);

    // Check if there are tool calls
    if (response.toolCalls.length > 0) {
      console.log(`🔧 Tool calls detected: ${response.toolCalls.length} calls`);

      // Add assistant message with tool calls
      const assistantMessage: Message = {
        role: 'assistant',
        content: null,
        toolCalls: response.toolCalls
      };

      return {
        messages: [assistantMessage],
        iterationCount: state.iterationCount + 1
      };
    }

    // No tool calls, we have the final response
    console.log('✅ Got final response');

    return {
      finalResponse: response.content || 'No response generated'
    };

  } catch (error: any) {
    console.error(`❌ Model ${state.selectedModel} execution error:`, error.message);

    return {
      error: error.message
    };
  }
}

/**
 * Node: Execute tool calls
 */
export async function executeToolsNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log('🔨 Executing tools...');

  // Get the last assistant message with tool calls
  const lastMessage = state.messages[state.messages.length - 1];

  if (!lastMessage || !lastMessage.toolCalls || lastMessage.toolCalls.length === 0) {
    return {};
  }

  const toolMessages: Message[] = [];
  const toolCallsMade: any[] = [];

  for (const toolCall of lastMessage.toolCalls) {
    console.log(`   Executing: ${toolCall.name}`);

    toolCallsMade.push({
      name: toolCall.name,
      arguments: toolCall.arguments,
      timestamp: new Date()
    });

    const toolResult = await executeTool(toolCall.name, toolCall.arguments);

    toolMessages.push({
      role: 'tool',
      toolCallId: toolCall.id,
      content: JSON.stringify(toolResult)
    });
  }

  return {
    messages: toolMessages,
    toolCallsMade: toolCallsMade
  };
}

/**
 * Node: Use fallback model
 */
export async function fallbackModelNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  if (!state.fallbackModel) {
    return {
      finalResponse: 'Error: Primary model failed and no fallback available'
    };
  }

  console.log(`⚠️  Using fallback model: ${state.fallbackModel}`);

  try {
    const llmService = LLMFactory.create(state.fallbackModel);
    const response = await llmService.chat(state.messages, TOOLS);

    return {
      selectedModel: state.fallbackModel,
      fallbackUsed: true,
      finalResponse: response.content || 'No response generated',
      error: null
    };

  } catch (error: any) {
    console.error(`❌ Fallback model also failed:`, error.message);

    return {
      finalResponse: 'Sorry, I encountered an error processing your request.',
      error: error.message
    };
  }
}

/**
 * Node: Save final response to database
 */
export async function saveFinalResponseNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  if (!state.finalResponse || !state.selectedModel) {
    return {};
  }

  console.log('💾 Saving final response...');

  // Save assistant message to session
  const assistantMessage: Message = {
    role: 'assistant',
    content: state.finalResponse,
    timestamp: new Date(),
    modelUsed: state.selectedModel,
    modelDisplayName: router.getModelDisplayName(state.selectedModel),
    fallbackUsed: state.fallbackUsed
  };

  await sessionRepo.appendMessage(state.sessionId, assistantMessage);

  // Save to chat repository for analytics
  await chatRepo.create({
    sessionId: state.sessionId,
    model: state.selectedModel,
    messages: state.messages,
    toolCallsMade: state.toolCallsMade
  });

  console.log('✅ Response saved successfully');

  return {};
}
