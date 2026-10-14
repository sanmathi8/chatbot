import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  allowedExtensions?: string[];
  maxSizeMB?: number;
}

export const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({
  onUpload,
  isUploading,
  allowedExtensions = ['.pdf', '.docx', '.txt', '.md'],
  maxSizeMB = 25,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndUpload = async (file: File) => {
    setError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      setError(`Unsupported format "${ext}". Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds the ${maxSizeMB} MB limit.`);
      return;
    }

    if (file.size === 0) {
      setError('Cannot upload an empty file.');
      return;
    }

    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await validateAndUpload(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await validateAndUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/60 shadow-inner'
            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 bg-white'
        } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedExtensions.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs mb-1">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div className="text-sm font-semibold text-slate-800">
            {isUploading ? 'Uploading and indexing...' : 'Click to upload or drag & drop'}
          </div>

          <p className="text-xs text-slate-500 max-w-xs">
            Supports PDF, DOCX, TXT, and Markdown files up to {maxSizeMB} MB
          </p>

          <div className="flex items-center gap-1.5 mt-2">
            {allowedExtensions.map((ext) => (
              <span
                key={ext}
                className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md border border-slate-200 uppercase"
              >
                {ext.replace('.', '')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
