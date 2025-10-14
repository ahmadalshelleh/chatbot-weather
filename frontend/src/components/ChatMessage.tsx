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
