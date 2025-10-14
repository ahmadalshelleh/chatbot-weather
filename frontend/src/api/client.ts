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

  getModels: async (): Promise<Model[]> => {
    const response = await apiClient.get<{ models: Model[] }>('/models');
    return response.data.models;
  }
};

export default apiClient;
