'use client'

/**
 * T035: MessagePanel - Message list + input area
 * Stick to bottom behavior for chat experience
 */

import React, { useRef, useEffect, useCallback } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { ConversationHeader } from './ConversationHeader'
import type {
  InboxConversation,
  InboxMessage,
  InboxLabel,
  InboxQuickReply,
  ConversationMode,
  ConversationPriority,
} from '@/types'

export interface MessagePanelProps {
  conversation: InboxConversation | null
  messages: InboxMessage[]
  labels: InboxLabel[]
  quickReplies: InboxQuickReply[]

  // Loading states
  isLoadingConversation: boolean
  isLoadingMessages: boolean
  isLoadingMore: boolean
  isSending: boolean
  quickRepliesLoading: boolean

  // Pagination
  hasMoreMessages: boolean
  onLoadMore: () => void

  // Actions
  onSendMessage: (content: string) => void
  onModeToggle: () => void
  onClose: () => void
  onReopen: () => void
  onPriorityChange: (priority: ConversationPriority) => void
  onLabelToggle: (labelId: string) => void
  /** T050: Handoff to human agent */
  onHandoff?: (params?: { reason?: string; summary?: string; pauseMinutes?: number }) => void
  /** T050: Return to bot mode */
  onReturnToBot?: () => void
  isUpdating?: boolean
  isHandingOff?: boolean
  isReturningToBot?: boolean
}

export function MessagePanel({
  conversation,
  messages,
  labels,
  quickReplies,
  isLoadingConversation,
  isLoadingMessages,
  isLoadingMore,
  isSending,
  quickRepliesLoading,
  hasMoreMessages,
  onLoadMore,
  onSendMessage,
  onModeToggle,
  onClose,
  onReopen,
  onPriorityChange,
  onLabelToggle,
  onHandoff,
  onReturnToBot,
  isUpdating,
  isHandingOff,
  isReturningToBot,
}: MessagePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevMessagesLengthRef = useRef(messages.length)

  // Check if user is at bottom
  const checkIfAtBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    const threshold = 50
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  }, [])

  // Handle scroll event
  const handleScroll = useCallback(() => {
    isAtBottomRef.current = checkIfAtBottom()

    // Load more when scrolled to top
    const el = scrollRef.current
    if (el && el.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      onLoadMore()
    }
  }, [checkIfAtBottom, hasMoreMessages, isLoadingMore, onLoadMore])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      // New message added
      if (isAtBottomRef.current) {
        scrollToBottom()
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages.length, scrollToBottom])

  // Initial scroll to bottom
  useEffect(() => {
    if (conversation && messages.length > 0) {
      scrollToBottom(false)
    }
  }, [conversation?.id])

  // No conversation selected
  if (!conversation && !isLoadingConversation) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-zinc-300">
          Selecione uma conversa
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Escolha uma conversa à esquerda para ver as mensagens
        </p>
      </div>
    )
  }

  // Loading state
  if (isLoadingConversation) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-sm text-zinc-500 mt-2">Carregando...</p>
      </div>
    )
  }

  const isOpen = conversation?.status === 'open'

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      {conversation && (
        <ConversationHeader
          conversation={conversation}
          labels={labels}
          onModeToggle={onModeToggle}
          onClose={onClose}
          onReopen={onReopen}
          onPriorityChange={onPriorityChange}
          onLabelToggle={onLabelToggle}
          onHandoff={onHandoff}
          onReturnToBot={onReturnToBot}
          isUpdating={isUpdating}
          isHandingOff={isHandingOff}
          isReturningToBot={isReturningToBot}
        />
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2 mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        )}

        {/* Load more button */}
        {hasMoreMessages && !isLoadingMore && (
          <div className="flex justify-center py-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              className="text-xs text-zinc-500"
            >
              Carregar mensagens anteriores
            </Button>
          </div>
        )}

        {/* Messages list */}
        {isLoadingMessages ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'animate-pulse rounded-2xl h-12 w-2/3',
                  i % 2 === 0 ? 'self-end bg-primary-600/20' : 'self-start bg-zinc-800'
                )}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-zinc-500">Nenhuma mensagem ainda</p>
            <p className="text-xs text-zinc-600 mt-1">
              Envie a primeira mensagem para iniciar a conversa
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottomRef.current && messages.length > 5 && (
        <div className="absolute bottom-20 right-6">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => scrollToBottom()}
            className="h-10 w-10 rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <MessageInput
        onSend={onSendMessage}
        isSending={isSending}
        disabled={!isOpen}
        placeholder={
          isOpen
            ? 'Digite sua mensagem...'
            : 'Conversa fechada. Reabra para enviar mensagens.'
        }
        quickReplies={quickReplies}
        quickRepliesLoading={quickRepliesLoading}
      />
    </div>
  )
}
