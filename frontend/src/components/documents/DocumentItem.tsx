import React, { useState } from 'react';
import type { DocumentItem as DocType } from '../../types';
import { DocumentStatusBadge } from '../common/Badge';
import { Trash2, Layers, AlertCircle, Calendar } from 'lucide-react';

interface DocumentItemProps {
  document: DocType;
  onDelete: (id: string) => Promise<void>;
}

export const DocumentItem: React.FC<DocumentItemProps> = ({ document, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${document.filename}" and its vector index?`)) {
      setIsDeleting(true);
      try {
        await onDelete(document.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getFileBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'docx':
      case 'doc':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'md':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 uppercase text-xs font-bold ${getFileBadgeColor(
            document.file_type
          )}`}
        >
          {document.file_type}
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-medium text-slate-900 truncate" title={document.filename}>
            {document.filename}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
            <span>{formatSize(document.file_size)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatDate(document.upload_time)}
            </span>
            {document.chunk_count > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                  <Layers className="w-3 h-3" />
                  {document.chunk_count} {document.chunk_count === 1 ? 'chunk' : 'chunks'}
                </span>
              </>
            )}
          </div>
          {document.error_message && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-600">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">{document.error_message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <DocumentStatusBadge status={document.status} />

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete document and vector index"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
