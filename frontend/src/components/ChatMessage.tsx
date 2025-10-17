import React from 'react';
import type { Message } from '../types/index';

interface Props {
  message: Message;
}

export const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
        {!isUser && message.modelDisplayName && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
            <span className="text-xs font-medium text-blue-600">
              {message.modelDisplayName}
            </span>
            {message.fallbackUsed && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                Fallback
              </span>
            )}
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span className={`text-xs mt-2 block ${isUser ? 'text-white/70' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};
