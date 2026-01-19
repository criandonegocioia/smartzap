'use client'

/**
 * T036: MessageBubble - Message with inbound/outbound styling, delivery status, timestamp
 * Different layouts for incoming vs outgoing messages
 */

import React, { memo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, CheckCheck, Clock, AlertCircle, Bot, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { InboxMessage, DeliveryStatus, Sentiment } from '@/types'

export interface MessageBubbleProps {
  message: InboxMessage
}

// Delivery status icon component
function DeliveryStatusIcon({ status }: { status: DeliveryStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-zinc-500" />
    case 'sent':
      return <Check className="h-3 w-3 text-zinc-500" />
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-zinc-500" />
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-400" />
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-400" />
    default:
      return null
  }
}

// Sentiment indicator
function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const config: Record<Sentiment, { emoji: string; label: string; color: string }> = {
    positive: { emoji: '😊', label: 'Positivo', color: 'text-green-400' },
    neutral: { emoji: '😐', label: 'Neutro', color: 'text-zinc-400' },
    negative: { emoji: '😔', label: 'Negativo', color: 'text-amber-400' },
    frustrated: { emoji: '😤', label: 'Frustrado', color: 'text-red-400' },
  }

  const { emoji, label, color } = config[sentiment]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('text-sm', color)}>{emoji}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Sentimento: {label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const {
    direction,
    content,
    message_type,
    delivery_status,
    created_at,
    ai_sentiment,
    ai_sources,
  } = message

  const isInbound = direction === 'inbound'
  const isAIResponse = !isInbound && (message.ai_response_id || ai_sources)

  // Format time
  const time = created_at
    ? format(new Date(created_at), 'HH:mm', { locale: ptBR })
    : ''

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        isInbound ? 'self-start' : 'self-end flex-row-reverse'
      )}
    >
      {/* Bubble */}
      <div
        className={cn(
          'rounded-2xl px-4 py-2 relative',
          isInbound
            ? 'bg-zinc-800 text-zinc-100 rounded-bl-md'
            : 'bg-primary-600 text-white rounded-br-md',
          isAIResponse && 'border border-blue-500/30'
        )}
      >
        {/* AI badge */}
        {isAIResponse && (
          <div className="flex items-center gap-1 text-[10px] text-blue-300 mb-1">
            <Bot className="h-3 w-3" />
            <span>Resposta IA</span>
            {ai_sources && ai_sources.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-0.5 hover:text-blue-200">
                    <Sparkles className="h-3 w-3" />
                    <span>{ai_sources.length}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium mb-1">Fontes utilizadas:</p>
                  <ul className="text-xs space-y-1">
                    {ai_sources.map((source, i) => (
                      <li key={i} className="truncate">
                        • {source.title}
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

        {/* Footer: time + status */}
        <div
          className={cn(
            'flex items-center gap-1.5 mt-1',
            isInbound ? 'justify-start' : 'justify-end'
          )}
        >
          {/* Sentiment for inbound messages */}
          {isInbound && ai_sentiment && (
            <SentimentBadge sentiment={ai_sentiment as Sentiment} />
          )}

          <span
            className={cn(
              'text-[10px]',
              isInbound ? 'text-zinc-500' : 'text-primary-200'
            )}
          >
            {time}
          </span>

          {/* Delivery status for outbound */}
          {!isInbound && delivery_status && (
            <DeliveryStatusIcon status={delivery_status} />
          )}
        </div>
      </div>
    </div>
  )
})
