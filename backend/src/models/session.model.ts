import mongoose, { Document, Schema } from 'mongoose';
import { Message } from '../types';

export interface ISession extends Document {
  sessionId: string;
  messages: Message[];
  metadata: {
    createdAt: Date;
    lastActive: Date;
    messageCount: number;
    totalTokens?: number;
  };
  active: boolean;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    messages: [{
      role: {
        type: String,
        required: true,
        enum: ['user', 'assistant', 'system', 'tool']
      },
      content: { type: String, required: true },
      toolCalls: [{
        type: Schema.Types.Mixed
      }],
      toolCallId: { type: String },
      name: { type: String },
      timestamp: { type: Date, default: Date.now },
      modelUsed: { type: String },
      modelDisplayName: { type: String },
      fallbackUsed: { type: Boolean }
    }],
    metadata: {
      createdAt: { type: Date, default: Date.now },
      lastActive: { type: Date, default: Date.now },
      messageCount: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 }
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'sessions'
  }
);

// Index for cleanup queries
SessionSchema.index({ 'metadata.lastActive': 1, active: 1 });

// Update lastActive on save
SessionSchema.pre('save', function(next) {
  this.metadata.lastActive = new Date();
  this.metadata.messageCount = this.messages.length;
  next();
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);
