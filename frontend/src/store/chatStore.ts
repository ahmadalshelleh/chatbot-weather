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
  newSession: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentModel: 'openai',
  isLoading: false,
  error: null,
  sessionId: generateSessionId(), // New session on every mount/refresh

  setModel: (model) => {
    set({ currentModel: model });
  },

  sendMessage: async (content: string) => {
    const { messages, sessionId } = get();

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
      let streamedContent = '';
      let toolCalls: any[] = [];
      let modelDisplayName = '';
      let fallbackUsed = false;

      // Call streaming API with only the new message
      await chatApi.sendMessageStream(
        content, // Send only the new message string
        sessionId, // Send session ID
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
        // onRouting - routing decision received
        (routing: { modelDisplayName: string; fallbackUsed?: boolean }) => {
          console.log('Routing:', routing);
          modelDisplayName = routing.modelDisplayName;
          fallbackUsed = routing.fallbackUsed || false;
        },
        // onDone - streaming complete
        (data) => {
          toolCalls = data.toolCallsMade || [];
          modelDisplayName = data.modelDisplayName || modelDisplayName;
          fallbackUsed = data.fallbackUsed || fallbackUsed;

          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: streamedContent || data.response,
                    toolCalls,
                    modelDisplayName,
                    fallbackUsed
                  }
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

  newSession: () => {
    const { sessionId: oldSessionId } = get();

    // Optionally deactivate old session in backend (fire and forget)
    if (oldSessionId) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/session/${oldSessionId}/deactivate`, {
        method: 'POST'
      }).catch(err => console.error('Failed to deactivate session:', err));
    }

    // Generate new session ID and clear messages
    set({ messages: [], error: null, sessionId: generateSessionId() });
  }
}));

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function generateSessionId(): string {
  return `session-${Date.now()}`;
}
