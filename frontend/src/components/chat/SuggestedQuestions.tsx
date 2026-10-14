import React from 'react';
import { HelpCircle, FileSearch, ArrowRight, Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  hasDocuments: boolean;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelect, hasDocuments }) => {
  const suggestions = hasDocuments
    ? [
        {
          title: 'Executive Summary',
          desc: 'What are the main key points and findings in the uploaded documents?',
          icon: <FileSearch className="w-4 h-4 text-indigo-500" />,
        },
        {
          title: 'Methodology & Requirements',
          desc: 'What specific requirements, constraints, or methods are outlined?',
          icon: <Sparkles className="w-4 h-4 text-blue-500" />,
        },
        {
          title: 'Data & Metrics',
          desc: 'Extract all important dates, metrics, percentages, and numerical figures.',
          icon: <ArrowRight className="w-4 h-4 text-sky-500" />,
        },
      ]
    : [
        {
          title: 'Document Q&A Demo',
          desc: 'How does DocuMind AI retrieve and ground answers using local embeddings and ChromaDB?',
          icon: <HelpCircle className="w-4 h-4 text-indigo-500" />,
        },
      ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mt-4">
      {suggestions.map((item, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(item.desc)}
          className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded-md bg-slate-50 group-hover:bg-indigo-50 transition-colors">
                {item.icon}
              </span>
              <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {item.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
              {item.desc}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Ask this</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      ))}
    </div>
  );
};
