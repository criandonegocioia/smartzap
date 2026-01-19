'use client'

/**
 * T071: InboxRetentionPanel - Configure inbox message retention
 * Allows setting how many days to keep inbox messages before cleanup
 */

import { useState, useEffect } from 'react'
import { Archive, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface InboxSettings {
  retention_days: number
}

export function InboxRetentionPanel() {
  const [retentionDays, setRetentionDays] = useState(90)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValue, setOriginalValue] = useState(90)

  // Load settings
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/settings/inbox')
        if (response.ok) {
          const data: InboxSettings = await response.json()
          setRetentionDays(data.retention_days)
          setOriginalValue(data.retention_days)
        }
      } catch (error) {
        console.error('Failed to load inbox settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Track changes
  useEffect(() => {
    setHasChanges(retentionDays !== originalValue)
  }, [retentionDays, originalValue])

  // Save handler
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retention_days: retentionDays }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const data: InboxSettings = await response.json()
      setOriginalValue(data.retention_days)
      setHasChanges(false)
      toast.success('Configurações salvas')
    } catch (error) {
      console.error('Failed to save inbox settings:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          <span className="text-sm text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Archive className="h-6 w-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">Retenção de Mensagens</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Define por quantos dias as mensagens do inbox são mantidas antes de serem arquivadas automaticamente.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="retention-days" className="text-sm text-zinc-300">
                Manter mensagens por:
              </label>
              <input
                id="retention-days"
                type="number"
                min={7}
                max={365}
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 7)}
                className="w-20 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <span className="text-sm text-zinc-400">dias</span>
            </div>

            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Valores permitidos: 7 a 365 dias. Mensagens mais antigas serão arquivadas automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}
