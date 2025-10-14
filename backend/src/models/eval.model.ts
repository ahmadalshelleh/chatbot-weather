import mongoose, { Document, Schema } from 'mongoose';
import { ModelProvider } from '../types';

export interface IEvalResult extends Document {
  testId: string;
  modelProvider: ModelProvider;
  passed: boolean;
  score: number;
  latencyMs: number;
  toolsCalled: string[];
  toolCallCount: number;
  response: string;
  errorMessages: string[];
  metadata: Record<string, any>;
  createdAt: Date;
}

const EvalResultSchema = new Schema<IEvalResult>(
  {
    testId: { type: String, required: true, index: true },
    modelProvider: { type: String, required: true },
    passed: { type: Boolean, required: true },
    score: { type: Number, required: true },
    latencyMs: { type: Number, required: true },
    toolsCalled: [{ type: String }],
    toolCallCount: { type: Number, required: true },
    response: { type: String },
    errorMessages: [{ type: String }],
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const EvalResult = mongoose.model<IEvalResult>('EvalResult', EvalResultSchema);
