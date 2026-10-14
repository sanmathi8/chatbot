import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { AppSettings, HealthStatus } from '../../types';
import { Cpu, Sliders, CheckCircle, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  health: HealthStatus | null;
  onSave: (updated: Partial<AppSettings>) => Promise<void>;
  onRefreshHealth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  health,
  onSave,
  onRefreshHealth,
}) => {
  const [llmModel, setLlmModel] = useState('');
  const [topK, setTopK] = useState(4);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.35);
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(120);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setLlmModel(settings.llm_model);
      setTopK(settings.top_k);
      setSimilarityThreshold(settings.similarity_threshold);
      setChunkSize(settings.chunk_size);
      setChunkOverlap(settings.chunk_overlap);
    }
  }, [settings, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        llm_model: llmModel,
        top_k: Number(topK),
        similarity_threshold: Number(similarityThreshold),
        chunk_size: Number(chunkSize),
        chunk_overlap: Number(chunkOverlap),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const modelsList = health?.available_ollama_models?.length
    ? health.available_ollama_models
    : settings?.available_models?.length
    ? settings.available_models
    : ['qwen2.5:0.5b'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RAG & Local AI Settings"
      description="Fine-tune local inference parameters, vector retrieval depth, and document chunking."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Ollama Local LLM */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              Local Ollama Model
            </label>
            <button
              type="button"
              onClick={onRefreshHealth}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh models
            </button>
          </div>

          <select
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          >
            {modelsList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <p className="text-[11px] text-slate-500">
            Select an installed Ollama model. To install more, run{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">
              ollama pull qwen2.5:3b
            </code>{' '}
            in your terminal.
          </p>
        </div>

        {/* Retrieval Parameters */}
        <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
          <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Retrieval Parameters
          </h4>

          {/* Top K */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">Top-K Chunks: {topK}</span>
              <span className="text-slate-400 text-[11px]">Default: 4</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Number of most relevant chunks passed to the LLM context.
            </p>
          </div>

          {/* Similarity Threshold */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">
                Similarity Threshold: {Number(similarityThreshold).toFixed(2)}
              </span>
              <span className="text-slate-400 text-[11px]">Default: 0.35</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Filters out irrelevant chunks below this cosine similarity threshold.
            </p>
          </div>
        </div>

        {/* Chunking Parameters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Chunk Size (chars)</label>
            <input
              type="number"
              min="200"
              max="2500"
              step="50"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Chunk Overlap (chars)</label>
            <input
              type="number"
              min="0"
              max="500"
              step="10"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 p-2.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
