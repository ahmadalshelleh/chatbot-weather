import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { useChatStore } from './store/chatStore';
import { Plus } from 'lucide-react';

function App() {
  const { messages, newSession } = useChatStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl
                      flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-400 to-blue-300
                           text-white p-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🌤️ Weather Assistant</h1>
            <p className="text-sm text-white/80">Powered by AI with intelligent routing</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={newSession}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 text-white
                         border border-white/30 hover:bg-white/30 transition-all
                         focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
            >
              <Plus size={18} />
              <span className="text-sm font-medium">New Session</span>
            </button>
          )}
        </header>

        {/* Chat Area */}
        <ChatContainer />

        {/* Input Area */}
        <ChatInput />
      </div>
    </div>
  );
}

export default App;
