import React from 'react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-sm w-fit">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-gray-600">Thinking...</span>
    </div>
  );
};
