import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types';
import { SourceReferenceCard } from './SourceReferenceCard';
import { Bot, User, Copy, Check, Clock } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 max-w-3xl ml-auto mb-6">
        <div className="flex flex-col items-end max-w-[85%]">
          <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-2xs text-sm leading-relaxed">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 px-1">
            {formatTime(message.created_at)}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-xs font-semibold shadow-2xs">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3.5 max-w-3xl mr-auto mb-6">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
        <Bot className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 max-w-[90%]">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4.5 shadow-2xs text-slate-800 text-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-400">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              DocuMind AI
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(message.created_at)}
              </span>
              <button
                onClick={handleCopy}
                title="Copy response"
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Markdown Content */}
          <div className="prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:text-indigo-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Grounded Source References */}
          {message.sources && message.sources.length > 0 && (
            <SourceReferenceCard sources={message.sources} />
          )}
        </div>
      </div>
    </div>
  );
};
