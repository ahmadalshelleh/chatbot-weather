import mongoose, { Document, Schema } from 'mongoose';
import { Message, ModelProvider } from '../types';

export interface IChatHistory extends Document {
  sessionId: string;
  modelProvider: ModelProvider;
  messages: Message[];
  toolCallsMade: Array<{
    name: string;
    arguments: Record<string, any>;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ChatHistorySchema = new Schema<IChatHistory>(
  {
    sessionId: { type: String, required: true, index: true },
    modelProvider: { type: String, required: true, enum: ['openai', 'anthropic', 'deepseek'] },
    messages: [{
      role: { type: String, required: true },
      content: { type: String },
      toolCalls: [{ type: Schema.Types.Mixed }],
      toolCallId: { type: String }
    }],
    toolCallsMade: [{
      name: { type: String, required: true },
      arguments: { type: Schema.Types.Mixed },
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
