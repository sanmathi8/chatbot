import React, { useState } from 'react';
import type { Conversation, DocumentItem, HealthStatus } from '../../types';
import { StatusIndicator } from '../common/StatusIndicator';
import { 
  Bot, 
  Plus, 
  MessageSquare, 
  Trash2, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  UploadCloud,
  Pencil,
  Check,
  X
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  documents: DocumentItem[];
  onOpenUploadModal: () => void;
  onOpenSettingsModal: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  health: HealthStatus | null;
  isLoadingHealth: boolean;
  onRefreshHealth: () => void;
}

function groupConversationsByDate(convs: Conversation[]) {
  const groups: { [key: string]: Conversation[] } = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Older': []
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7Days = startOfToday - 7 * 86400000;

  for (const conv of convs) {
    const rawDate = conv.updated_at || conv.created_at;
    const t = new Date(rawDate).getTime();
    if (t >= startOfToday) {
      groups['Today'].push(conv);
    } else if (t >= startOfYesterday) {
      groups['Yesterday'].push(conv);
    } else if (t >= startOf7Days) {
      groups['Previous 7 Days'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  }

  return Object.entries(groups).filter(([_, items]) => items.length > 0);
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  documents,
  onOpenUploadModal,
  onOpenSettingsModal,
  isCollapsed,
  onToggleCollapse,
  health,
  isLoadingHealth,
  onRefreshHealth,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const readyDocsCount = documents.filter((d) => d.status === 'ready').length;
  const groupedConversations = groupConversationsByDate(conversations);

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const submitEditing = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim() && onRenameConversation) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      className={`relative flex flex-col bg-slate-50/90 border-r border-slate-200 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-18' : 'w-72'
      }`}
    >
      {/* Brand & Collapse Trigger */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Bot className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight">DocuMind AI</span>
                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md">
                  RAG
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Local Document Intelligence</p>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs shadow-2xs transition-all cursor-pointer ${
            isCollapsed ? 'p-2.5' : ''
          }`}
          title="Start new conversation"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Conversation</span>}
        </button>
      </div>

      {/* Documents Quick Widget */}
      <div className="px-3 py-1">
        <button
          onClick={onOpenUploadModal}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-left transition-all cursor-pointer shadow-2xs group ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
          title="Manage uploaded documents"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  Knowledge Base
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {readyDocsCount} {readyDocsCount === 1 ? 'doc indexed' : 'docs indexed'}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="p-1 rounded-md text-slate-400 group-hover:text-indigo-600">
              <UploadCloud className="w-4 h-4" />
            </span>
          )}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {conversations.length === 0 ? (
          !isCollapsed && (
            <div className="p-6 text-center text-xs text-slate-400 font-normal">
              No conversations yet.<br />Ask a question to start.
            </div>
          )
        ) : isCollapsed ? (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`flex justify-center p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                  }`}
                  title={conv.title}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
              );
            })}
          </div>
        ) : (
          groupedConversations.map(([period, items]) => (
            <div key={period} className="space-y-1">
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {period}
              </div>
              {items.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      if (!isEditing) onSelectConversation(conv.id);
                    }}
                    className={`group relative flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200 ring-1 ring-indigo-50'
                        : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 border border-transparent'
                    }`}
                    title={conv.title}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitEditing(conv.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="w-full text-xs bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={(e) => submitEditing(conv.id, e)}
                            className="p-1 text-emerald-600 hover:text-emerald-700"
                            title="Save"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="truncate text-xs font-medium">
                          {conv.title}
                        </span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                        <button
                          onClick={(e) => startEditing(conv, e)}
                          title="Rename chat"
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          title="Delete chat"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer / Status & Settings */}
      <div className="p-3 border-t border-slate-200/80 bg-white/70 space-y-2">
        <button
          onClick={onOpenSettingsModal}
          className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
          title="Open settings"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          {!isCollapsed && <span>Settings & Models</span>}
        </button>

        {!isCollapsed && (
          <div className="pt-1">
            <StatusIndicator
              health={health}
              isLoading={isLoadingHealth}
              onRefresh={onRefreshHealth}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
