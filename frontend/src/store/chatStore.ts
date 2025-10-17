import { create } from 'zustand';
import type { Message, ModelProvider } from '../types/index';
import { chatApi } from '../api/client';

interface ChatState {
  messages: Message[];
  currentModel: ModelProvider;
  isLoading: boolean;
  error: string | null;
  sessionId: string;

  // Actions
  setModel: (model: ModelProvider) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentModel: 'openai',
  isLoading: false,
  error: null,
  sessionId: generateSessionId(),

  setModel: (model) => {
    set({ currentModel: model });
  },

  sendMessage: async (content: string) => {
    const { messages, currentModel } = get();

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    set({ messages: [...messages, userMessage], isLoading: true, error: null });

    // Create a placeholder assistant message for streaming
    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    set(state => ({
      messages: [...state.messages, assistantMessage]
    }));

    try {
      // Prepare request
      const requestMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      let streamedContent = '';
      let toolCalls: any[] = [];

      // Call streaming API
      await chatApi.sendMessageStream(
        {
          messages: requestMessages,
          model: currentModel
        },
        // onChunk - append content as it streams
        (chunk: string) => {
          streamedContent += chunk;
          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: streamedContent }
                : msg
            )
          }));
        },
        // onTool - tool is being called
        (tool: { name: string; arguments: any }) => {
          console.log('Tool called:', tool);
        },
        // onDone - streaming complete
        (data) => {
          toolCalls = data.toolCallsMade || [];
          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: streamedContent || data.response, toolCalls }
                : msg
            ),
            isLoading: false
          }));
        },
        // onError
        (error: string) => {
          console.error('Streaming error:', error);
          set({
            error,
            isLoading: false
          });
        }
      );

    } catch (error: any) {
      console.error('Chat error:', error);
      set({
        error: error.response?.data?.error || 'Failed to send message',
        isLoading: false
      });
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  }
}));

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateSessionId(): string {
  return `session-${Date.now()}`;
}
