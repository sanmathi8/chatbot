import React from 'react';
import type { HealthStatus } from '../../types';

interface StatusIndicatorProps {
  health: HealthStatus | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ health, isLoading, onRefresh }) => {
  if (isLoading && !health) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium animate-pulse border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
        Checking Local AI...
      </div>
    );
  }

  const isOnline = health?.ollama_available ?? false;

  return (
    <div
      onClick={onRefresh}
      title={isOnline ? `Ollama Active: ${health?.ollama_model} (${health?.ready_documents_count || 0} docs indexed)` : 'Ollama Offline. Click to recheck.'}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
        isOnline
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
          : 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/70'
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isOnline && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isOnline ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        ></span>
      </span>

      <span className="font-semibold">
        {isOnline ? 'Local AI Online' : 'Local AI Offline'}
      </span>

      {isOnline && health?.ollama_model && (
        <span className="text-[11px] text-emerald-600 border-l border-emerald-200 pl-2 max-w-[110px] truncate">
          {health.ollama_model}
        </span>
      )}
    </div>
  );
};
