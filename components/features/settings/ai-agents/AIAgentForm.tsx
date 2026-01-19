'use client'

/**
 * T058: AIAgentForm - Create/Edit form for AI agents
 * Form with all agent configuration options
 */

import React, { useState, useEffect } from 'react'
import { X, Bot, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { AIAgent } from '@/types'
import type { CreateAIAgentParams, UpdateAIAgentParams } from '@/services/aiAgentService'

// Available models
const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Rápido e eficiente' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Balanceado' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Mais capaz, mais lento' },
]

// Default system prompt template
const DEFAULT_SYSTEM_PROMPT = `Você é um assistente virtual da empresa [NOME_EMPRESA].

Sua função é:
- Responder dúvidas dos clientes de forma educada e profissional
- Ajudar com informações sobre produtos e serviços
- Agendar atendimentos quando necessário
- Transferir para um atendente humano quando o assunto exigir

Regras:
- Sempre responda em português do Brasil
- Seja cordial e empático
- Se não souber a resposta, admita e ofereça alternativas
- Nunca invente informações sobre preços ou disponibilidade`

export interface AIAgentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: AIAgent | null
  onSubmit: (params: CreateAIAgentParams | UpdateAIAgentParams) => Promise<void>
  isSubmitting?: boolean
}

export function AIAgentForm({
  open,
  onOpenChange,
  agent,
  onSubmit,
  isSubmitting,
}: AIAgentFormProps) {
  const isEditing = !!agent

  // Form state
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState('gemini-2.0-flash')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [debounceMs, setDebounceMs] = useState(5000)
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setSystemPrompt(agent.system_prompt)
      setModel(agent.model)
      setTemperature(agent.temperature)
      setMaxTokens(agent.max_tokens)
      setDebounceMs(agent.debounce_ms)
      setIsActive(agent.is_active)
      setIsDefault(agent.is_default)
    } else {
      // Reset to defaults for new agent
      setName('')
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
      setModel('gemini-2.0-flash')
      setTemperature(0.7)
      setMaxTokens(1024)
      setDebounceMs(5000)
      setIsActive(true)
      setIsDefault(false)
    }
  }, [agent, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const params: CreateAIAgentParams = {
      name,
      system_prompt: systemPrompt,
      model,
      temperature,
      max_tokens: maxTokens,
      debounce_ms: debounceMs,
      is_active: isActive,
      is_default: isDefault,
    }

    await onSubmit(params)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary-400" />
            {isEditing ? 'Editar Agente' : 'Novo Agente IA'}
          </SheetTitle>
          <SheetDescription>
            Configure o comportamento do agente de atendimento automático
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Agente</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Atendente Virtual"
              required
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Modelo IA</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <span>{m.name}</span>
                      <span className="text-xs text-zinc-500">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">
              System Prompt
              <span className="text-xs text-zinc-500 ml-2">
                (Instruções para o agente)
              </span>
            </Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Descreva como o agente deve se comportar..."
              className="min-h-[200px] font-mono text-sm"
              required
            />
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-zinc-400">{temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([v]) => setTemperature(v)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-zinc-500">
              Menor = mais focado e previsível. Maior = mais criativo e variado.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Max Tokens (resposta)</Label>
              <span className="text-sm text-zinc-400">{maxTokens}</span>
            </div>
            <Slider
              value={[maxTokens]}
              onValueChange={([v]) => setMaxTokens(v)}
              min={256}
              max={4096}
              step={128}
              className="w-full"
            />
            <p className="text-xs text-zinc-500">
              Tamanho máximo da resposta. 1024 tokens ≈ 750 palavras.
            </p>
          </div>

          {/* Debounce */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Debounce (segundos)</Label>
              <span className="text-sm text-zinc-400">{debounceMs / 1000}s</span>
            </div>
            <Slider
              value={[debounceMs]}
              onValueChange={([v]) => setDebounceMs(v)}
              min={1000}
              max={15000}
              step={1000}
              className="w-full"
            />
            <p className="text-xs text-zinc-500">
              Tempo de espera antes de responder (para mensagens consecutivas).
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Agente ativo</Label>
                <p className="text-xs text-zinc-500">
                  Desativar impede que seja usado em conversas
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {!isEditing && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isDefault">Definir como padrão</Label>
                  <p className="text-xs text-zinc-500">
                    Será usado automaticamente em novas conversas
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name || !systemPrompt}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Salvar' : 'Criar Agente'}
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
