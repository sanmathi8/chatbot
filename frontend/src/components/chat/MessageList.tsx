import React, { useEffect, useRef } from 'react';
import type { Message, SourceReference } from '../../types';
import { MessageItem } from './MessageItem';
import { SourceReferenceCard } from './SourceReferenceCard';
import { Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  streamingToken: string;
  streamingSources: SourceReference[];
  streamingStatus?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isGenerating,
  streamingToken,
  streamingSources,
  streamingStatus,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingToken, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-2">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {/* Active Streaming or Loading Bubble */}
      {isGenerating && (
        <div className="flex gap-3.5 max-w-3xl mr-auto mb-6 animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Bot className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0 max-w-[90%]">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4.5 shadow-2xs text-slate-800 text-sm">
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100 text-xs text-indigo-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{streamingStatus || 'Searching documents and generating response...'}</span>
              </div>

              {streamingToken ? (
                <div className="prose prose-slate prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingToken}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-2 text-slate-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              )}

              {streamingSources.length > 0 && (
                <SourceReferenceCard sources={streamingSources} />
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
