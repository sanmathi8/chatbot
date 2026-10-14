import React from 'react';
import type { DocumentStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'indigo';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};

export const DocumentStatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  switch (status) {
    case 'ready':
      return (
        <Badge variant="success" size="sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Ready
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="error" size="sm">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Failed
        </Badge>
      );
    case 'extracting':
      return (
        <Badge variant="warning" size="sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin" />
          Extracting text
        </Badge>
      );
    case 'embedding':
      return (
        <Badge variant="indigo" size="sm">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-spin" />
          Creating embeddings
        </Badge>
      );
    case 'indexing':
      return (
        <Badge variant="info" size="sm">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          Indexing
        </Badge>
      );
    case 'uploaded':
    default:
      return (
        <Badge variant="default" size="sm">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Uploaded
        </Badge>
      );
  }
};
