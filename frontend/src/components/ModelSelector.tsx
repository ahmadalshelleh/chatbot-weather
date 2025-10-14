import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import type { ModelProvider } from '../types/index';
import { ChevronDown } from 'lucide-react';

const MODELS: Array<{ id: ModelProvider; name: string; logo: string; color: string }> = [
  { id: 'openai', name: 'GPT-3.5 Turbo', logo: '🤖', color: 'bg-green-500' },
  { id: 'anthropic', name: 'Claude 3.5 Sonnet', logo: '🧠', color: 'bg-orange-500' },
  { id: 'deepseek', name: 'DeepSeek V3', logo: '🔮', color: 'bg-purple-500' }
];

export const ModelSelector: React.FC = () => {
  const { currentModel, setModel } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = MODELS.find(m => m.id === currentModel) || MODELS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (modelId: ModelProvider) => {
    setModel(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/20 text-white 
                   border border-white/30 hover:bg-white/30 transition-all
                   focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm
                   min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
          <span className={`w-6 h-6 rounded-full ${selectedModel.color} flex items-center justify-center text-xs`}>
            {selectedModel.logo}
          </span>
          <span className="text-sm font-medium">{selectedModel.name}</span>
        </div>
        <ChevronDown 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-lg shadow-lg 
                        border border-gray-200 overflow-hidden z-50 animate-fadeIn">
          {MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => handleSelectModel(model.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                         transition-colors text-left ${
                           model.id === currentModel ? 'bg-blue-50' : ''
                         }`}
            >
              <span className={`w-8 h-8 rounded-full ${model.color} flex items-center justify-center`}>
                {model.logo}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{model.name}</div>
              </div>
              {model.id === currentModel && (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
