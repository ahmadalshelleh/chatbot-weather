import axios from 'axios';
import type { ChatRequest, ChatResponse, Model } from '../types/index';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const chatApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>('/chat', request);
    return response.data;
  },

  sendMessageStream: async (
    message: string,
    sessionId: string,
    onChunk: (chunk: string) => void,
    onTool: (tool: { name: string; arguments: any }) => void,
    onRouting: (routing: { modelDisplayName: string; fallbackUsed?: boolean }) => void,
    onDone: (data: ChatResponse) => void,
    onError: (error: string) => void,
    onProgress?: (progress: { stage: string; message: string }) => void
  ): Promise<void> => {
    console.group('🚀 Frontend: Starting SSE Stream');
    console.log('URL:', `${API_URL}/chat/stream`);
    console.log('Message:', message);
    console.log('Session ID:', sessionId);

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({ message }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let eventCount = 0;

      console.log('📖 Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ Stream reading complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('📦 Raw chunk received:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));

        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              console.log('🏁 Received [DONE] signal');
              console.groupEnd();
              return;
            }

            try {
              const event = JSON.parse(data);
              eventCount++;
              console.log(`📨 Event #${eventCount}:`, event.type, event.data);

              if (event.type === 'content') {
                console.log('  → Calling onChunk with:', event.data.substring(0, 50) + '...');
                onChunk(event.data);
              } else if (event.type === 'tool') {
                console.log('  → Calling onTool with:', event.data);
                onTool(event.data);
              } else if (event.type === 'routing') {
                console.log('  → Calling onRouting with:', event.data);
                onRouting(event.data);
              } else if (event.type === 'progress') {
                console.log('  → Calling onProgress with:', event.data);
                onProgress?.(event.data);
              } else if (event.type === 'done') {
                console.log('  → Calling onDone with response length:', event.data?.response?.length || 0);
                onDone(event.data);
              } else if (event.type === 'error') {
                console.error('  → Calling onError with:', event.data);
                onError(event.data);
              } else {
                console.warn('  → Unknown event type:', event.type);
              }
            } catch (e) {
              console.error('❌ Failed to parse SSE data:', data, e);
            }
          } else if (line.trim()) {
            console.warn('⚠️ Non-SSE line:', line);
          }
        }
      }

      console.log(`✅ Total events received: ${eventCount}`);
      console.groupEnd();

    } catch (error: any) {
      console.error('❌ Stream error:', error);
      console.groupEnd();
      onError(error.message || 'Failed to send message');
    }
  },

  getModels: async (): Promise<Model[]> => {
    const response = await apiClient.get<{ models: Model[] }>('/models');
    return response.data.models;
  }
};

export default apiClient;
