'use client'

/**
 * T032: InboxView - Main layout with sidebar + panel split
 * Uses ResizablePanels for adjustable layout
 * T074: Added granular error boundaries for each panel
 */

import React, { useCallback } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ConversationList } from './ConversationList'
import { MessagePanel } from './MessagePanel'
import { AlertTriangle, RefreshCw, MessageSquare, Users } from 'lucide-react'
import type {
  InboxConversation,
  InboxMessage,
  InboxLabel,
  InboxQuickReply,
  ConversationStatus,
  ConversationMode,
  ConversationPriority,
} from '@/types'

export interface InboxViewProps {
  // Conversations
  conversations: InboxConversation[]
  isLoadingConversations: boolean
  totalUnread: number

  // Selected conversation
  selectedConversationId: string | null
  onSelectConversation: (id: string | null) => void
  selectedConversation: InboxConversation | null
  isLoadingSelectedConversation: boolean

  // Messages
  messages: InboxMessage[]
  isLoadingMessages: boolean
  isLoadingMoreMessages: boolean
  hasMoreMessages: boolean
  onLoadMoreMessages: () => void

  // Message sending
  onSendMessage: (content: string) => void
  isSending: boolean

  // Labels
  labels: InboxLabel[]

  // Quick Replies
  quickReplies: InboxQuickReply[]
  quickRepliesLoading: boolean

  // Filters
  search: string
  onSearchChange: (search: string) => void
  statusFilter: ConversationStatus | null
  onStatusFilterChange: (status: ConversationStatus | null) => void
  modeFilter: ConversationMode | null
  onModeFilterChange: (mode: ConversationMode | null) => void
  labelFilter: string | null
  onLabelFilterChange: (labelId: string | null) => void

  // Conversation actions
  onModeToggle: () => void
  onCloseConversation: () => void
  onReopenConversation: () => void
  onPriorityChange: (priority: ConversationPriority) => void
  onLabelToggle: (labelId: string) => void
  /** T050: Handoff to human */
  onHandoff?: (params?: { reason?: string; summary?: string; pauseMinutes?: number }) => void
  /** T050: Return to bot */
  onReturnToBot?: () => void
  isUpdatingConversation: boolean
  isHandingOff?: boolean
  isReturningToBot?: boolean
}

export function InboxView({
  conversations,
  isLoadingConversations,
  totalUnread,
  selectedConversationId,
  onSelectConversation,
  selectedConversation,
  isLoadingSelectedConversation,
  messages,
  isLoadingMessages,
  isLoadingMoreMessages,
  hasMoreMessages,
  onLoadMoreMessages,
  onSendMessage,
  isSending,
  labels,
  quickReplies,
  quickRepliesLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  modeFilter,
  onModeFilterChange,
  labelFilter,
  onLabelFilterChange,
  onModeToggle,
  onCloseConversation,
  onReopenConversation,
  onPriorityChange,
  onLabelToggle,
  onHandoff,
  onReturnToBot,
  isUpdatingConversation,
  isHandingOff,
  isReturningToBot,
}: InboxViewProps) {
  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (id: string) => {
      onSelectConversation(id)
    },
    [onSelectConversation]
  )

  // T074: Panel-specific error fallbacks
  const ConversationListFallback = (
    <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-950">
      <div className="w-12 h-12 mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <Users className="w-6 h-6 text-red-400" />
      </div>
      <p className="text-sm text-zinc-400 mb-3">Erro ao carregar conversas</p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Recarregar
      </button>
    </div>
  )

  const MessagePanelFallback = (
    <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-950">
      <div className="w-12 h-12 mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-red-400" />
      </div>
      <p className="text-sm text-zinc-400 mb-3">Erro ao carregar mensagens</p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Recarregar
      </button>
    </div>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-[calc(100vh-64px)] bg-zinc-950">
        <ResizablePanelGroup direction="horizontal">
          {/* Conversation list sidebar - T074: wrapped with ErrorBoundary */}
          <ResizablePanel
            defaultSize={30}
            minSize={20}
            maxSize={40}
            className="border-r border-zinc-800"
          >
            <ErrorBoundary fallback={ConversationListFallback}>
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                isLoading={isLoadingConversations}
                totalUnread={totalUnread}
                labels={labels}
                search={search}
                onSearchChange={onSearchChange}
                statusFilter={statusFilter}
                onStatusFilterChange={onStatusFilterChange}
                modeFilter={modeFilter}
                onModeFilterChange={onModeFilterChange}
                labelFilter={labelFilter}
                onLabelFilterChange={onLabelFilterChange}
              />
            </ErrorBoundary>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Message panel - T074: wrapped with ErrorBoundary */}
          <ResizablePanel defaultSize={70} minSize={50}>
            <ErrorBoundary fallback={MessagePanelFallback}>
              <MessagePanel
                conversation={selectedConversation}
                messages={messages}
                labels={labels}
                quickReplies={quickReplies}
                isLoadingConversation={isLoadingSelectedConversation}
                isLoadingMessages={isLoadingMessages}
                isLoadingMore={isLoadingMoreMessages}
                isSending={isSending}
                quickRepliesLoading={quickRepliesLoading}
                hasMoreMessages={hasMoreMessages}
                onLoadMore={onLoadMoreMessages}
                onSendMessage={onSendMessage}
                onModeToggle={onModeToggle}
                onClose={onCloseConversation}
                onReopen={onReopenConversation}
                onPriorityChange={onPriorityChange}
                onLabelToggle={onLabelToggle}
                onHandoff={onHandoff}
                onReturnToBot={onReturnToBot}
                isUpdating={isUpdatingConversation}
                isHandingOff={isHandingOff}
                isReturningToBot={isReturningToBot}
              />
            </ErrorBoundary>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  )
}
