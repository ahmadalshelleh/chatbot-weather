import { ModelSelector } from './components/ModelSelector';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl
                      flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-400 to-blue-300
                           text-white p-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🌤️ Weather Assistant</h1>
            <p className="text-sm text-white/80">Powered by multiple LLMs</p>
          </div>
          <ModelSelector />
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
