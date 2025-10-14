import React from 'react';
import { useChatStore } from '../store/chatStore';

const DEFAULT_SUGGESTIONS = [
  "What's the weather in Paris?",
  "Will it rain in London tomorrow?",
  "Compare weather in Tokyo and Seoul",
  "Show me the temperature in New York"
];

export const SuggestionsBar: React.FC = () => {
  const { isLoading, messages } = useChatStore();

  // Only show when there's no conversation yet and not loading
  if (isLoading || messages.length > 0) return null;

  return (
    <div className="px-6 pb-4 bg-white">
      <div className="flex flex-wrap gap-2 justify-center">
        {DEFAULT_SUGGESTIONS.map((text, i) => (
          <button
            key={i}
            onClick={() => useChatStore.getState().sendMessage(text)}
            className="px-3 py-2 text-sm rounded-full border border-gray-200 bg-white hover:bg-gray-50"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
};
