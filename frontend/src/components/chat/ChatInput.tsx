import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, AlertCircle } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onStopGeneration?: () => void;
  isGenerating: boolean;
  hasReadyDocuments: boolean;
  isOllamaOnline: boolean;
  onOpenUpload: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  hasReadyDocuments,
  isOllamaOnline,
  onOpenUpload,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(trimmed);
  };

  const isDisabled = !isOllamaOnline || isGenerating;

  return (
    <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border-t border-slate-200 shrink-0">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Warning banner if no documents or Ollama offline */}
        {!isOllamaOnline ? (
          <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                <strong>Ollama is offline.</strong> Make sure Ollama is installed and running locally on port 11434.
              </span>
            </div>
          </div>
        ) : !hasReadyDocuments ? (
          <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No indexed documents found. Upload documents to query your knowledge base.</span>
            </div>
            <button
              onClick={onOpenUpload}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
            >
              Upload Now
            </button>
          </div>
        ) : null}

        {/* Input container */}
        <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl p-2 transition-all shadow-2xs">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isOllamaOnline
                ? 'Local LLM offline. Please start Ollama...'
                : !hasReadyDocuments
                ? 'Upload a document above or ask questions...'
                : 'Ask a question about your uploaded documents... (Press Enter to send, Shift+Enter for new line)'
            }
            disabled={!isOllamaOnline}
            className="w-full max-h-40 py-1.5 px-2 bg-transparent border-0 resize-none text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 leading-relaxed"
          />

          <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                title="Stop generation"
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || isDisabled}
                title="Send message"
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
          <span>DocuMind AI retrieves only facts grounded in your uploaded documents.</span>
          <span>Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
