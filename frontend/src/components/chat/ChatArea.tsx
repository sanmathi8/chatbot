import React from 'react';
import type { Message, SourceReference } from '../../types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { Bot, FileText, Database, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button } from '../common/Button';

interface ChatAreaProps {
  messages: Message[];
  isGenerating: boolean;
  streamingToken: string;
  streamingSources: SourceReference[];
  streamingStatus?: string;
  hasReadyDocuments: boolean;
  isOllamaOnline: boolean;
  onSendMessage: (msg: string) => Promise<void>;
  onStopGeneration?: () => void;
  onOpenUpload: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isGenerating,
  streamingToken,
  streamingSources,
  streamingStatus,
  hasReadyDocuments,
  isOllamaOnline,
  onSendMessage,
  onStopGeneration,
  onOpenUpload,
}) => {
  const showEmptyState = messages.length === 0 && !isGenerating;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/40 overflow-hidden relative">
      {showEmptyState ? (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-2xl flex flex-col items-center">
            {/* Logo Badge */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 mb-4">
              <Bot className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome to DocuMind AI
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
              Ask questions about your uploaded documents. DocuMind retrieves relevant context with local vector embeddings and generates grounded answers with your local LLM.
            </p>

            {/* How RAG Works Diagram / Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-6 text-left">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-800">1. Ingest & Chunk</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload PDF, Word, or Text. Text is extracted, cleaned, and split into chunks.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-800">2. Vector Search</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  ChromaDB retrieves the top semantically relevant excerpts matching your query.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-800">3. Grounded Answer</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ollama synthesizes answers using only supplied sources with verified citations.
                </p>
              </div>
            </div>

            {/* Quick Upload CTA if no documents */}
            {!hasReadyDocuments && (
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="md"
                  icon={<UploadCloud className="w-4 h-4" />}
                  onClick={onOpenUpload}
                >
                  Upload Your First Document
                </Button>
              </div>
            )}

            {/* Suggested Question Cards */}
            <SuggestedQuestions
              onSelect={onSendMessage}
              hasDocuments={hasReadyDocuments}
            />
          </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          isGenerating={isGenerating}
          streamingToken={streamingToken}
          streamingSources={streamingSources}
          streamingStatus={streamingStatus}
        />
      )}

      {/* Chat Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        isGenerating={isGenerating}
        hasReadyDocuments={hasReadyDocuments}
        isOllamaOnline={isOllamaOnline}
        onOpenUpload={onOpenUpload}
      />
    </div>
  );
};
