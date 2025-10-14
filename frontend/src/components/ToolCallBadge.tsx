import React from 'react';
import type { ToolCall } from '../types/index';
import { Wrench } from 'lucide-react';

interface Props {
  toolCalls: ToolCall[];
}

export const ToolCallBadge: React.FC<Props> = ({ toolCalls }) => {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {toolCalls.map((tool, index) => (
        <div
          key={index}
          className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200
                     rounded-full text-xs text-blue-700"
        >
          <Wrench size={12} />
          <span className="font-mono">{tool.name}</span>
          <span className="text-blue-500">
            ({Object.keys(tool.arguments).join(', ')})
          </span>
        </div>
      ))}
    </div>
  );
};
