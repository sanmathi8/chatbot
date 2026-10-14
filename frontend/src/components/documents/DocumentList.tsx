import React from 'react';
import type { DocumentItem as DocType } from '../../types';
import { DocumentItem } from './DocumentItem';
import { FileQuestion, Trash2 } from 'lucide-react';

interface DocumentListProps {
  documents: DocType[];
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  isLoading?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDelete,
  onClearAll,
}) => {
  const readyDocs = documents.filter((d) => d.status === 'ready');

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL documents and completely reset vector memory? This cannot be undone.')) {
      await onClearAll();
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <FileQuestion className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700">No documents uploaded</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Upload PDF, DOCX, TXT, or Markdown documents to allow DocuMind AI to retrieve answers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>
          {documents.length} {documents.length === 1 ? 'Document' : 'Documents'} ({readyDocs.length} ready for Q&A)
        </span>
        <button
          onClick={handleClearAll}
          className="text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {documents.map((doc) => (
          <DocumentItem key={doc.id} document={doc} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};
