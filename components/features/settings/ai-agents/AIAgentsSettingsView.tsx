'use client'

/**
 * T057: AIAgentsSettingsView - Main view for AI agents management
 * Lists agents with create/edit/delete capabilities
 */

import React, { useState, useCallback } from 'react'
import { Bot, Plus, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AIAgentCard } from './AIAgentCard'
import { AIAgentForm } from './AIAgentForm'
import type { AIAgent } from '@/types'
import type { CreateAIAgentParams, UpdateAIAgentParams } from '@/services/aiAgentService'

export interface AIAgentsSettingsViewProps {
  agents: AIAgent[]
  isLoading: boolean
  error: Error | null
  onCreate: (params: CreateAIAgentParams) => Promise<AIAgent>
  onUpdate: (id: string, params: UpdateAIAgentParams) => Promise<AIAgent>
  onDelete: (id: string) => Promise<unknown>
  onSetDefault: (id: string) => Promise<AIAgent>
  onToggleActive: (id: string, isActive: boolean) => Promise<AIAgent>
  isCreating?: boolean
  isUpdating?: boolean
  isDeleting?: boolean
}

export function AIAgentsSettingsView({
  agents,
  isLoading,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onSetDefault,
  onToggleActive,
  isCreating,
  isUpdating,
  isDeleting,
}: AIAgentsSettingsViewProps) {
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null)

  // Delete confirmation state
  const [deleteAgent, setDeleteAgent] = useState<AIAgent | null>(null)

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setEditingAgent(null)
    setIsFormOpen(true)
  }, [])

  const handleOpenEdit = useCallback((agent: AIAgent) => {
    setEditingAgent(agent)
    setIsFormOpen(true)
  }, [])

  const handleFormSubmit = useCallback(
    async (params: CreateAIAgentParams | UpdateAIAgentParams) => {
      if (editingAgent) {
        await onUpdate(editingAgent.id, params as UpdateAIAgentParams)
      } else {
        await onCreate(params as CreateAIAgentParams)
      }
      setIsFormOpen(false)
      setEditingAgent(null)
    },
    [editingAgent, onCreate, onUpdate]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (deleteAgent) {
      await onDelete(deleteAgent.id)
      setDeleteAgent(null)
    }
  }, [deleteAgent, onDelete])

  const handleSetDefault = useCallback(
    async (agent: AIAgent) => {
      await onSetDefault(agent.id)
    },
    [onSetDefault]
  )

  const handleToggleActive = useCallback(
    async (agent: AIAgent, isActive: boolean) => {
      await onToggleActive(agent.id, isActive)
    },
    [onToggleActive]
  )

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/10">
                <Bot className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <CardTitle>Agentes IA</CardTitle>
                <CardDescription>
                  Configure os agentes de atendimento automático
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Agente
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-sm text-zinc-400">Erro ao carregar agentes</p>
              <p className="text-xs text-zinc-500">{error.message}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && agents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-zinc-800 mb-4">
                <Bot className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-1">
                Nenhum agente configurado
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                Crie seu primeiro agente IA para automatizar o atendimento
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </div>
          )}

          {/* Agents grid */}
          {!isLoading && !error && agents.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {agents.map((agent) => (
                <AIAgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleOpenEdit}
                  onDelete={setDeleteAgent}
                  onSetDefault={handleSetDefault}
                  onToggleActive={handleToggleActive}
                  isUpdating={isUpdating}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit form */}
      <AIAgentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        agent={editingAgent}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agente &ldquo;{deleteAgent?.name}&rdquo;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
