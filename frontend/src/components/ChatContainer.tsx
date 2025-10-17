import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';

export const ChatContainer: React.FC = () => {
  const { messages, isLoading, error } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-blue-50/30">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🌤️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome to Weather Assistant
            </h2>
            <p className="text-gray-600">
              Ask me about weather conditions anywhere in the world
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
            {[
              "What's the weather in Paris?",
              "Will it rain in London tomorrow?",
              "Compare weather in Tokyo and Seoul"
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => useChatStore.getState().sendMessage(suggestion)}
                className="px-4 py-2 bg-white border-2 border-blue-400 text-blue-500 rounded-full
                           hover:bg-blue-400 hover:text-white transition-colors text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && <ThinkingIndicator />}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};
