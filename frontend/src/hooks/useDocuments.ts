import { useState, useEffect, useCallback, useRef } from 'react';
import type { DocumentItem } from '../types';
import { ApiService } from '../services/api';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<any>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await ApiService.getDocuments();
      setDocuments(data.documents);
      return data.documents;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
      return [];
    }
  }, []);

  // Poll while any document is in progress (uploaded, extracting, embedding, indexing)
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.status === 'uploaded' || d.status === 'extracting' || d.status === 'embedding' || d.status === 'indexing'
    );

    if (hasPending) {
      pollTimerRef.current = setInterval(fetchDocuments, 2000);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [documents, fetchDocuments]);

  useEffect(() => {
    setIsLoading(true);
    fetchDocuments().finally(() => setIsLoading(false));
  }, [fetchDocuments]);

  const uploadDocument = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const newDoc = await ApiService.uploadDocument(file);
      setDocuments((prev) => [newDoc, ...prev]);
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await ApiService.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      setError(err.message || 'Delete failed');
      throw err;
    }
  };

  const clearAllDocuments = async () => {
    try {
      await ApiService.clearAllDocuments();
      setDocuments([]);
    } catch (err: any) {
      setError(err.message || 'Clear all failed');
      throw err;
    }
  };

  return {
    documents,
    isLoading,
    isUploading,
    error,
    refresh: fetchDocuments,
    uploadDocument,
    deleteDocument,
    clearAllDocuments,
  };
}
