'use client'

/**
 * T038: ConversationHeader - Contact info, mode badge, actions
 * Mode toggle button, close/reopen, priority selector
 */

import React, { useState } from 'react'
import {
  Bot,
  User,
  Phone,
  MoreVertical,
  X,
  RotateCcw,
  Tag,
  AlertCircle,
  UserCheck,
  ArrowLeftRight,
  PauseCircle,
  PlayCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  InboxConversation,
  InboxLabel,
  ConversationMode,
  ConversationPriority,
} from '@/types'

export interface ConversationHeaderProps {
  conversation: InboxConversation
  labels: InboxLabel[]
  onModeToggle: () => void
  onClose: () => void
  onReopen: () => void
  onPriorityChange: (priority: ConversationPriority) => void
  onLabelToggle: (labelId: string) => void
  /** Transfer conversation to human agent (with optional reason/summary) */
  onHandoff?: (params?: { reason?: string; summary?: string; pauseMinutes?: number }) => void
  /** Return conversation to bot mode */
  onReturnToBot?: () => void
  /** T067: Pause automation for X minutes */
  onPause?: (params: { duration_minutes: number; reason?: string }) => void
  /** T067: Resume automation immediately */
  onResume?: () => void
  isUpdating?: boolean
  isHandingOff?: boolean
  isReturningToBot?: boolean
  isPausing?: boolean
  isResuming?: boolean
}

const priorityLabels: Record<ConversationPriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-zinc-400' },
  normal: { label: 'Normal', color: 'text-zinc-300' },
  high: { label: 'Alta', color: 'text-amber-400' },
  urgent: { label: 'Urgente', color: 'text-red-400' },
}

// Pause duration options in minutes
const pauseDurations = [
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 240, label: '4 horas' },
  { value: 480, label: '8 horas' },
  { value: 1440, label: '24 horas' },
]

export function ConversationHeader({
  conversation,
  labels,
  onModeToggle,
  onClose,
  onReopen,
  onPriorityChange,
  onLabelToggle,
  onHandoff,
  onReturnToBot,
  onPause,
  onResume,
  isUpdating,
  isHandingOff,
  isReturningToBot,
  isPausing,
  isResuming,
}: ConversationHeaderProps) {
  const { phone, contact, mode, status, priority, labels: conversationLabels, automation_paused_until } = conversation

  const displayName = contact?.name || phone
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const isOpen = status === 'open'
  const isBotMode = mode === 'bot'
  const currentPriority = priority || 'normal'
  const priorityConfig = priorityLabels[currentPriority]

  // T067: Check if automation is paused
  const isPaused = automation_paused_until && new Date(automation_paused_until) > new Date()
  const pausedUntilDate = automation_paused_until ? new Date(automation_paused_until) : null

  // Format remaining pause time
  const formatPauseRemaining = () => {
    if (!pausedUntilDate) return ''
    const now = new Date()
    const diff = pausedUntilDate.getTime() - now.getTime()
    const minutes = Math.ceil(diff / (1000 * 60))
    if (minutes < 60) return `${minutes}min restantes`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h restantes`
  }

  // Check if a label is assigned
  const isLabelAssigned = (labelId: string) =>
    conversationLabels?.some((l) => l.id === labelId) ?? false

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
      {/* Contact info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-zinc-700 text-zinc-300">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white">{displayName}</h3>
            {!isOpen && (
              <Badge variant="secondary" className="text-[10px] h-4">
                Fechada
              </Badge>
            )}
            {/* T067: Pause indicator */}
            {isPaused && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] h-4 gap-1 border-orange-500/50 text-orange-400">
                    <PauseCircle className="h-3 w-3" />
                    Pausado
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Bot pausado • {formatPauseRemaining()}
                </TooltipContent>
              </Tooltip>
            )}
            {currentPriority !== 'normal' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle
                    className={cn('h-4 w-4', priorityConfig.color)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  Prioridade: {priorityConfig.label}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Phone className="h-3 w-3" />
            <span>{phone}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Mode toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onModeToggle}
              disabled={isUpdating || !isOpen}
              className={cn(
                'h-8 gap-1.5',
                isBotMode
                  ? 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10'
                  : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
              )}
            >
              {isBotMode ? (
                <>
                  <Bot className="h-3.5 w-3.5" />
                  <span className="text-xs">Bot</span>
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5" />
                  <span className="text-xs">Humano</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isBotMode
              ? 'Clique para assumir manualmente'
              : 'Clique para ativar o bot'}
          </TooltipContent>
        </Tooltip>

        {/* More actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Priority submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <AlertCircle className="h-4 w-4 mr-2" />
                Prioridade
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={currentPriority}
                  onValueChange={(v) => onPriorityChange(v as ConversationPriority)}
                >
                  {(Object.entries(priorityLabels) as [ConversationPriority, typeof priorityConfig][]).map(
                    ([value, config]) => (
                      <DropdownMenuRadioItem
                        key={value}
                        value={value}
                        className={config.color}
                      >
                        {config.label}
                      </DropdownMenuRadioItem>
                    )
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Labels submenu */}
            {labels.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tag className="h-4 w-4 mr-2" />
                  Etiquetas
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {labels.map((label) => (
                    <DropdownMenuItem
                      key={label.id}
                      onClick={() => onLabelToggle(label.id)}
                    >
                      <div
                        className="h-3 w-3 rounded-full mr-2"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                      {isLabelAssigned(label.id) && (
                        <span className="ml-auto text-primary-400">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <DropdownMenuSeparator />

            {/* Handoff / Return to bot */}
            {isOpen && isBotMode && onHandoff && (
              <DropdownMenuItem
                onClick={() => onHandoff()}
                disabled={isHandingOff}
                className="text-amber-400"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {isHandingOff ? 'Transferindo...' : 'Transferir para atendente'}
              </DropdownMenuItem>
            )}
            {isOpen && !isBotMode && onReturnToBot && (
              <DropdownMenuItem
                onClick={onReturnToBot}
                disabled={isReturningToBot}
                className="text-blue-400"
              >
                <Bot className="h-4 w-4 mr-2" />
                {isReturningToBot ? 'Retornando...' : 'Retornar ao bot'}
              </DropdownMenuItem>
            )}

            {/* T067: Pause/Resume automation */}
            {isOpen && isBotMode && onPause && !isPaused && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={isPausing}>
                  <PauseCircle className="h-4 w-4 mr-2" />
                  {isPausing ? 'Pausando...' : 'Pausar automação'}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="text-xs text-zinc-500">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Por quanto tempo?
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {pauseDurations.map(({ value, label }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => onPause({ duration_minutes: value })}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {isOpen && isPaused && onResume && (
              <DropdownMenuItem
                onClick={onResume}
                disabled={isResuming}
                className="text-emerald-400"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {isResuming ? 'Resumindo...' : 'Retomar automação'}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Close/Reopen */}
            {isOpen ? (
              <DropdownMenuItem
                onClick={onClose}
                className="text-amber-400"
              >
                <X className="h-4 w-4 mr-2" />
                Fechar conversa
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={onReopen}
                className="text-green-400"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reabrir conversa
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
