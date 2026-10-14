import React, { useState } from 'react';
import type { SourceReference } from '../../types';
import { FileText, ChevronDown, ChevronRight, Copy, Check, Sparkles } from 'lucide-react';

interface SourceReferenceCardProps {
  sources: SourceReference[];
}

export const SourceReferenceCard: React.FC<SourceReferenceCardProps> = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!sources || sources.length === 0) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mt-3.5 border border-indigo-100 bg-indigo-50/30 rounded-xl overflow-hidden transition-all text-xs">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-indigo-50/50 hover:bg-indigo-100/50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 text-indigo-900 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            {sources.length} {sources.length === 1 ? 'Source Reference' : 'Source References'}
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-semibold">
            Grounded
          </span>
        </div>

        <div className="flex items-center gap-1 text-indigo-600 font-medium">
          <span className="text-[11px]">{isExpanded ? 'Hide' : 'View'}</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 space-y-2.5 divide-y divide-indigo-100/80 bg-white">
          {sources.map((source, index) => {
            const similarityPercent = Math.round(source.score * 100);
            return (
              <div key={source.id || index} className="pt-2.5 first:pt-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 truncate max-w-[200px]" title={source.filename}>
                      <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                      {source.filename}
                    </span>
                    {source.page_number && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                        Page {source.page_number}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      {similarityPercent}% match
                    </span>
                    <button
                      onClick={() => handleCopy(source.id, source.excerpt)}
                      title="Copy excerpt"
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      {copiedId === source.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-mono text-[11px] leading-relaxed select-text">
                  "{source.excerpt}"
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
