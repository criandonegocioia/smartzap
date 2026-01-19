'use client'

/**
 * T037: MessageInput - Textarea + send button + quick replies trigger
 * Ctrl+Enter to send, expandable textarea
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { QuickRepliesPopover } from './QuickRepliesPopover'
import type { InboxQuickReply } from '@/types'

export interface MessageInputProps {
  onSend: (content: string) => void
  isSending: boolean
  disabled?: boolean
  placeholder?: string
  quickReplies: InboxQuickReply[]
  quickRepliesLoading?: boolean
}

export function MessageInput({
  onSend,
  isSending,
  disabled,
  placeholder = 'Digite sua mensagem...',
  quickReplies,
  quickRepliesLoading,
}: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [value])

  // Handle send
  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isSending || disabled) return

    onSend(trimmed)
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isSending, disabled, onSend])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Insert quick reply content
  const handleQuickReplySelect = useCallback((content: string) => {
    setValue((prev) => {
      // If there's existing text, add a space before
      if (prev.trim()) {
        return `${prev.trimEnd()} ${content}`
      }
      return content
    })

    // Focus textarea after inserting
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [])

  const canSend = value.trim().length > 0 && !isSending && !disabled

  return (
    <div className="flex items-end gap-2 p-3 border-t border-zinc-800 bg-zinc-900">
      {/* Quick replies */}
      <QuickRepliesPopover
        quickReplies={quickReplies}
        onSelect={handleQuickReplySelect}
        isLoading={quickRepliesLoading}
      />

      {/* Input area */}
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className={cn(
            'min-h-[40px] max-h-[150px] resize-none py-2.5 pr-10',
            'bg-zinc-800 border-zinc-700',
            'focus:border-primary-500 focus:ring-primary-500/20'
          )}
        />
        <span className="absolute bottom-2 right-2 text-[10px] text-zinc-600">
          Ctrl+Enter
        </span>
      </div>

      {/* Send button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className={cn(
              'h-10 w-10 shrink-0',
              canSend
                ? 'bg-primary-500 hover:bg-primary-600'
                : 'bg-zinc-800 text-zinc-500'
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{canSend ? 'Enviar mensagem' : 'Digite uma mensagem'}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
