import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const { sendMessage, isLoading } = useChatStore();

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput(''); // Clear input immediately
    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-3 p-4 bg-white border-t border-gray-200">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about weather..."
        disabled={isLoading}
        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-full
                   focus:outline-none focus:border-primary transition-colors
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSubmit}
        disabled={isLoading || !input.trim()}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary-dark
                   text-white flex items-center justify-center
                   hover:scale-105 active:scale-95 transition-transform
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send size={20} />
      </button>
    </div>
  );
};
