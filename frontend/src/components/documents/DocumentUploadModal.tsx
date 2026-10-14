import React from 'react';
import { Modal } from '../common/Modal';
import { DocumentDropzone } from './DocumentDropzone';
import { DocumentList } from './DocumentList';
import type { DocumentItem } from '../../types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  isUploading: boolean;
  isLoading: boolean;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  documents,
  onUpload,
  onDelete,
  onClearAll,
  isUploading,
  isLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Document Management & Ingestion"
      description="Upload documents to extract, chunk, embed, and index into local ChromaDB storage."
      maxWidth="xl"
    >
      <div className="space-y-6">
        <DocumentDropzone onUpload={onUpload} isUploading={isUploading} />

        <div className="border-t border-slate-100 pt-4">
          <DocumentList
            documents={documents}
            onDelete={onDelete}
            onClearAll={onClearAll}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Modal>
  );
};
