import React from 'react';
import type { HealthStatus, Conversation } from '../../types';
import { StatusIndicator } from '../common/StatusIndicator';
import { Button } from '../common/Button';
import { 
  FileUp, 
  Settings, 
  Menu, 
  Trash2, 
  Layers
} from 'lucide-react';

interface HeaderProps {
  activeConversation: Conversation | null;
  onClearChat: () => void;
  onOpenUploadModal: () => void;
  onOpenSettingsModal: () => void;
  onToggleMobileSidebar: () => void;
  readyDocsCount: number;
  health: HealthStatus | null;
  isLoadingHealth: boolean;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeConversation,
  onClearChat,
  onOpenUploadModal,
  onOpenSettingsModal,
  onToggleMobileSidebar,
  readyDocsCount,
  health,
  isLoadingHealth,
  onRefreshHealth,
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between z-20 shrink-0">
      {/* Left: Mobile Menu & Conversation Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {activeConversation ? activeConversation.title : 'DocuMind AI Workspace'}
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" />
              {readyDocsCount} {readyDocsCount === 1 ? 'document indexed' : 'documents indexed'}
            </span>
            <span>•</span>
            <span>Vector RAG</span>
          </div>
        </div>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        <StatusIndicator
          health={health}
          isLoading={isLoadingHealth}
          onRefresh={onRefreshHealth}
        />

        <Button
          variant="outline"
          size="sm"
          icon={<FileUp className="w-3.5 h-3.5 text-indigo-600" />}
          onClick={onOpenUploadModal}
          className="hidden sm:inline-flex"
        >
          Documents
        </Button>

        <button
          onClick={onOpenSettingsModal}
          title="Settings"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
        >
          <Settings className="w-4 h-4" />
        </button>

        {activeConversation && (
          <button
            onClick={onClearChat}
            title="Clear current chat"
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
