import React, { useState, useEffect } from 'react';
import { useHealth } from './hooks/useHealth';
import { useDocuments } from './hooks/useDocuments';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';
import { ApiService } from './services/api';
import type { AppSettings } from './types';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ChatArea } from './components/chat/ChatArea';
import { DocumentUploadModal } from './components/documents/DocumentUploadModal';
import { SettingsModal } from './components/settings/SettingsModal';

export const App: React.FC = () => {
  // Application State
  const { health, isLoading: isLoadingHealth, refresh: refreshHealth } = useHealth();
  const { 
    documents, 
    isLoading: isLoadingDocs, 
    isUploading, 
    uploadDocument, 
    deleteDocument, 
    clearAllDocuments, 
  } = useDocuments();

  const {
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    setActiveMessages,
    setActiveConversationId,
    loadConversation,
    newChat,
    deleteConversation,
    renameConversation,
    refreshConversations,
  } = useConversations();

  const {
    sendMessage,
    stopGeneration,
    isGenerating,
    streamingToken,
    streamingSources,
    streamingStatus,
  } = useChat({
    activeConversationId,
    onTurnComplete: async () => {
      await refreshConversations();
    },
    setActiveConversationId,
    messages: activeMessages,
    setMessages: setActiveMessages,
  });

  // Settings State
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    ApiService.getSettings()
      .then(setSettings)
      .catch((err) => console.error('Failed to load settings', err));
  }, []);

  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    const res = await ApiService.updateSettings(updated);
    setSettings(res);
    refreshHealth();
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');
  const isOllamaOnline = health?.ollama_available ?? false;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans">
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => {
            loadConversation(id);
          }}
          onNewChat={newChat}
          onDeleteConversation={deleteConversation}
          onRenameConversation={renameConversation}
          documents={documents}
          onOpenUploadModal={() => setIsUploadOpen(true)}
          onOpenSettingsModal={() => setIsSettingsOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          health={health}
          isLoadingHealth={isLoadingHealth}
          onRefreshHealth={refreshHealth}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10 flex flex-col">
            <Sidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                loadConversation(id);
                setIsMobileSidebarOpen(false);
              }}
              onNewChat={() => {
                newChat();
                setIsMobileSidebarOpen(false);
              }}
              onDeleteConversation={deleteConversation}
              onRenameConversation={renameConversation}
              documents={documents}
              onOpenUploadModal={() => {
                setIsUploadOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenSettingsModal={() => {
                setIsSettingsOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              health={health}
              isLoadingHealth={isLoadingHealth}
              onRefreshHealth={refreshHealth}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        <Header
          activeConversation={activeConversation}
          onClearChat={newChat}
          onOpenUploadModal={() => setIsUploadOpen(true)}
          onOpenSettingsModal={() => setIsSettingsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          readyDocsCount={readyDocs.length}
          health={health}
          isLoadingHealth={isLoadingHealth}
          onRefreshHealth={refreshHealth}
        />

        <ChatArea
          messages={activeMessages}
          isGenerating={isGenerating}
          streamingToken={streamingToken}
          streamingSources={streamingSources}
          streamingStatus={streamingStatus}
          hasReadyDocuments={readyDocs.length > 0}
          isOllamaOnline={isOllamaOnline}
          onSendMessage={sendMessage}
          onStopGeneration={stopGeneration}
          onOpenUpload={() => setIsUploadOpen(true)}
        />
      </div>

      {/* Document Upload & Ingestion Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        documents={documents}
        onUpload={uploadDocument}
        onDelete={deleteDocument}
        onClearAll={clearAllDocuments}
        isUploading={isUploading}
        isLoading={isLoadingDocs}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        health={health}
        onSave={handleSaveSettings}
        onRefreshHealth={refreshHealth}
      />
    </div>
  );
};

export default App;
