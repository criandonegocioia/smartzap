/**
 * useInbox - Controller hook for the Inbox page
 * Orchestrates conversations, messages, labels, and quick replies
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConversations, useConversationMutations } from './useConversations'
import { useConversationWithMessages } from './useConversation'
import { useLabels } from './useLabels'
import { useQuickReplies } from './useQuickReplies'
import type { ConversationStatus, ConversationMode, ConversationPriority } from '@/types'

export interface UseInboxOptions {
  initialConversationId?: string | null
}

export function useInbox(options: UseInboxOptions = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State for filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | null>(null)
  const [modeFilter, setModeFilter] = useState<ConversationMode | null>(null)
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Selected conversation ID (from URL or state)
  const [selectedId, setSelectedId] = useState<string | null>(
    options.initialConversationId || null
  )

  // Sync with URL params
  useEffect(() => {
    const urlConversationId = searchParams.get('c')
    if (urlConversationId && urlConversationId !== selectedId) {
      setSelectedId(urlConversationId)
    }
  }, [searchParams])

  // Conversations list
  const {
    conversations,
    total,
    totalPages,
    totalUnread,
    isLoading: isLoadingConversations,
    hasNextPage,
  } = useConversations({
    page,
    status: statusFilter ?? undefined,
    mode: modeFilter ?? undefined,
    labelId: labelFilter ?? undefined,
    search: search || undefined,
  })

  // Conversation mutations
  const conversationMutations = useConversationMutations()

  // Selected conversation with messages
  const {
    conversation: selectedConversation,
    isLoadingConversation: isLoadingSelectedConversation,
    updateConversation,
    messages,
    isLoadingMessages,
    isLoadingMore: isLoadingMoreMessages,
    hasMoreMessages,
    sendMessage,
    isSending,
    loadMoreMessages,
  } = useConversationWithMessages(selectedId)

  // Labels
  const { labels, isLoading: isLoadingLabels } = useLabels()

  // Quick Replies
  const { quickReplies, isLoading: isLoadingQuickReplies } = useQuickReplies()

  // Select conversation and update URL
  const handleSelectConversation = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      if (id) {
        // Update URL without full navigation
        const url = new URL(window.location.href)
        url.searchParams.set('c', id)
        router.replace(url.pathname + url.search, { scroll: false })
      } else {
        const url = new URL(window.location.href)
        url.searchParams.delete('c')
        router.replace(url.pathname + url.search, { scroll: false })
      }
    },
    [router]
  )

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedId) return
      await sendMessage({ content, message_type: 'text' })
    },
    [selectedId, sendMessage]
  )

  // Toggle mode (bot <-> human)
  const handleModeToggle = useCallback(async () => {
    if (!selectedConversation) return
    const newMode: ConversationMode =
      selectedConversation.mode === 'bot' ? 'human' : 'bot'
    await conversationMutations.switchMode({ id: selectedConversation.id, mode: newMode })
  }, [selectedConversation, conversationMutations])

  // Close conversation
  const handleCloseConversation = useCallback(async () => {
    if (!selectedConversation) return
    await conversationMutations.close(selectedConversation.id)
  }, [selectedConversation, conversationMutations])

  // Reopen conversation
  const handleReopenConversation = useCallback(async () => {
    if (!selectedConversation) return
    await conversationMutations.reopen(selectedConversation.id)
  }, [selectedConversation, conversationMutations])

  // Change priority
  const handlePriorityChange = useCallback(
    async (priority: ConversationPriority) => {
      if (!selectedConversation) return
      await updateConversation({ priority })
    },
    [selectedConversation, updateConversation]
  )

  // Toggle label
  const handleLabelToggle = useCallback(
    async (labelId: string) => {
      if (!selectedConversation) return
      const currentLabels = selectedConversation.labels?.map((l) => l.id) || []
      const hasLabel = currentLabels.includes(labelId)
      const newLabels = hasLabel
        ? currentLabels.filter((id) => id !== labelId)
        : [...currentLabels, labelId]
      await updateConversation({ labels: newLabels })
    },
    [selectedConversation, updateConversation]
  )

  // T050: Handoff to human
  const handleHandoff = useCallback(
    async (params?: { reason?: string; summary?: string; pauseMinutes?: number }) => {
      if (!selectedConversation) return
      await conversationMutations.handoff({ id: selectedConversation.id, ...params })
    },
    [selectedConversation, conversationMutations]
  )

  // T050: Return to bot
  const handleReturnToBot = useCallback(async () => {
    if (!selectedConversation) return
    await conversationMutations.returnToBot(selectedConversation.id)
  }, [selectedConversation, conversationMutations])

  return {
    // Conversations
    conversations,
    total,
    totalPages,
    totalUnread,
    isLoadingConversations,
    page,
    setPage,
    hasNextPage,

    // Selected conversation
    selectedConversationId: selectedId,
    onSelectConversation: handleSelectConversation,
    selectedConversation: selectedConversation ?? null,
    isLoadingSelectedConversation,

    // Messages
    messages,
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    onLoadMoreMessages: loadMoreMessages,
    onSendMessage: handleSendMessage,
    isSending,

    // Labels
    labels,
    isLoadingLabels,

    // Quick Replies
    quickReplies,
    quickRepliesLoading: isLoadingQuickReplies,

    // Filters
    search,
    onSearchChange: setSearch,
    statusFilter,
    onStatusFilterChange: setStatusFilter,
    modeFilter,
    onModeFilterChange: setModeFilter,
    labelFilter,
    onLabelFilterChange: setLabelFilter,

    // Conversation actions
    onModeToggle: handleModeToggle,
    onCloseConversation: handleCloseConversation,
    onReopenConversation: handleReopenConversation,
    onPriorityChange: handlePriorityChange,
    onLabelToggle: handleLabelToggle,
    // T050: Handoff actions
    onHandoff: handleHandoff,
    onReturnToBot: handleReturnToBot,
    isUpdatingConversation:
      conversationMutations.isUpdating ||
      conversationMutations.isSwitchingMode ||
      conversationMutations.isClosing ||
      conversationMutations.isReopening,
    isHandingOff: conversationMutations.isHandingOff,
    isReturningToBot: conversationMutations.isReturningToBot,
  }
}
