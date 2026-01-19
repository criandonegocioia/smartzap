'use client'

/**
 * T033: ConversationList - Filterable list with unread badges
 * Shows conversation previews with search and filter support
 */

import React, { useState, useMemo } from 'react'
import { Search, Filter, Bot, User, Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConversationItem } from './ConversationItem'
import type { InboxConversation, InboxLabel, ConversationStatus, ConversationMode } from '@/types'

export interface ConversationListProps {
  conversations: InboxConversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading: boolean
  totalUnread: number

  // Filters
  labels: InboxLabel[]
  search: string
  onSearchChange: (search: string) => void
  statusFilter: ConversationStatus | null
  onStatusFilterChange: (status: ConversationStatus | null) => void
  modeFilter: ConversationMode | null
  onModeFilterChange: (mode: ConversationMode | null) => void
  labelFilter: string | null
  onLabelFilterChange: (labelId: string | null) => void
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  totalUnread,
  labels,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  modeFilter,
  onModeFilterChange,
  labelFilter,
  onLabelFilterChange,
}: ConversationListProps) {
  const [showFilters, setShowFilters] = useState(false)

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (statusFilter) count++
    if (modeFilter) count++
    if (labelFilter) count++
    return count
  }, [statusFilter, modeFilter, labelFilter])

  // Clear all filters
  const clearFilters = () => {
    onStatusFilterChange(null)
    onModeFilterChange(null)
    onLabelFilterChange(null)
    onSearchChange('')
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Conversas</h2>
            {totalUnread > 0 && (
              <Badge className="h-5 text-xs px-1.5 bg-primary-500">
                {totalUnread > 99 ? '99+' : totalUnread}
              </Badge>
            )}
          </div>
          <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-2',
                  activeFilterCount > 0 && 'text-primary-400'
                )}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="ml-1 text-xs">{activeFilterCount}</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={statusFilter === null}
                onCheckedChange={() => onStatusFilterChange(null)}
              >
                Todas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'open'}
                onCheckedChange={() => onStatusFilterChange('open')}
              >
                Abertas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'closed'}
                onCheckedChange={() => onStatusFilterChange('closed')}
              >
                Fechadas
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Modo</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={modeFilter === null}
                onCheckedChange={() => onModeFilterChange(null)}
              >
                Todos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={modeFilter === 'bot'}
                onCheckedChange={() => onModeFilterChange('bot')}
              >
                <Bot className="h-3 w-3 mr-2" />
                Bot
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={modeFilter === 'human'}
                onCheckedChange={() => onModeFilterChange('human')}
              >
                <User className="h-3 w-3 mr-2" />
                Humano
              </DropdownMenuCheckboxItem>

              {labels.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Etiquetas</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={labelFilter === null}
                    onCheckedChange={() => onLabelFilterChange(null)}
                  >
                    Todas
                  </DropdownMenuCheckboxItem>
                  {labels.map((label) => (
                    <DropdownMenuCheckboxItem
                      key={label.id}
                      checked={labelFilter === label.id}
                      onCheckedChange={() => onLabelFilterChange(label.id)}
                    >
                      <Tag
                        className="h-3 w-3 mr-2"
                        style={{ color: label.color }}
                      />
                      {label.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}

              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-zinc-400"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3 mr-2" />
                    Limpar filtros
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm bg-zinc-900 border-zinc-800"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          // Skeleton loading
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400">
              {search || activeFilterCount > 0
                ? 'Nenhuma conversa encontrada'
                : 'Nenhuma conversa ainda'}
            </p>
            {(search || activeFilterCount > 0) && (
              <Button
                variant="link"
                size="sm"
                className="mt-2 text-primary-400"
                onClick={clearFilters}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          // Conversation items
          <div>
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
