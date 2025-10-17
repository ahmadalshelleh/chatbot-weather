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
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onTool: (tool: { name: string; arguments: any }) => void,
    onRouting: (routing: { modelDisplayName: string; fallbackUsed?: boolean }) => void,
    onDone: (data: ChatResponse) => void,
    onError: (error: string) => void
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              return;
            }

            try {
              const event = JSON.parse(data);

              if (event.type === 'content') {
                onChunk(event.data);
              } else if (event.type === 'tool') {
                onTool(event.data);
              } else if (event.type === 'routing') {
                onRouting(event.data);
              } else if (event.type === 'done') {
                onDone(event.data);
              } else if (event.type === 'error') {
                onError(event.data);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error: any) {
      onError(error.message || 'Failed to send message');
    }
  },

  getModels: async (): Promise<Model[]> => {
    const response = await apiClient.get<{ models: Model[] }>('/models');
    return response.data.models;
  }
};

export default apiClient;
