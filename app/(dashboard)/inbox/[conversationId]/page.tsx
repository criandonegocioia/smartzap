'use client'

/**
 * T041: Inbox/[conversationId] Page - Deep linking to specific conversation
 * URL param → conversation selection
 */

import { Suspense, use } from 'react'
import { InboxView } from '@/components/features/inbox'
import { useInbox } from '@/hooks/useInbox'
import { Loader2 } from 'lucide-react'

interface InboxConversationPageProps {
  params: Promise<{ conversationId: string }>
}

function InboxConversationPageContent({ conversationId }: { conversationId: string }) {
  const inbox = useInbox({ initialConversationId: conversationId })

  return (
    <InboxView
      // Conversations
      conversations={inbox.conversations}
      isLoadingConversations={inbox.isLoadingConversations}
      totalUnread={inbox.totalUnread}
      // Selected conversation
      selectedConversationId={inbox.selectedConversationId}
      onSelectConversation={inbox.onSelectConversation}
      selectedConversation={inbox.selectedConversation}
      isLoadingSelectedConversation={inbox.isLoadingSelectedConversation}
      // Messages
      messages={inbox.messages}
      isLoadingMessages={inbox.isLoadingMessages}
      isLoadingMoreMessages={inbox.isLoadingMoreMessages}
      hasMoreMessages={inbox.hasMoreMessages}
      onLoadMoreMessages={inbox.onLoadMoreMessages}
      onSendMessage={inbox.onSendMessage}
      isSending={inbox.isSending}
      // Labels
      labels={inbox.labels}
      // Quick Replies
      quickReplies={inbox.quickReplies}
      quickRepliesLoading={inbox.quickRepliesLoading}
      // Filters
      search={inbox.search}
      onSearchChange={inbox.onSearchChange}
      statusFilter={inbox.statusFilter}
      onStatusFilterChange={inbox.onStatusFilterChange}
      modeFilter={inbox.modeFilter}
      onModeFilterChange={inbox.onModeFilterChange}
      labelFilter={inbox.labelFilter}
      onLabelFilterChange={inbox.onLabelFilterChange}
      // Conversation actions
      onModeToggle={inbox.onModeToggle}
      onCloseConversation={inbox.onCloseConversation}
      onReopenConversation={inbox.onReopenConversation}
      onPriorityChange={inbox.onPriorityChange}
      onLabelToggle={inbox.onLabelToggle}
      // T050: Handoff actions
      onHandoff={inbox.onHandoff}
      onReturnToBot={inbox.onReturnToBot}
      isUpdatingConversation={inbox.isUpdatingConversation}
      isHandingOff={inbox.isHandingOff}
      isReturningToBot={inbox.isReturningToBot}
    />
  )
}

function LoadingFallback() {
  return (
    <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-sm text-zinc-500">Carregando conversa...</p>
      </div>
    </div>
  )
}

export default function InboxConversationPage({ params }: InboxConversationPageProps) {
  const { conversationId } = use(params)

  return (
    <Suspense fallback={<LoadingFallback />}>
      <InboxConversationPageContent conversationId={conversationId} />
    </Suspense>
  )
}
