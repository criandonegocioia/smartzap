'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Code,
  Bold,
  Italic,
  Strikethrough,
  Plus,
  ChevronDown,
  Play,
  ExternalLink,
  CornerDownLeft,
  GripVertical,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Spec = any

type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'

type ButtonType =
  | 'QUICK_REPLY'
  | 'URL'
  | 'PHONE_NUMBER'
  | 'COPY_CODE'
  | 'OTP'
  | 'FLOW'
  | 'CATALOG'
  | 'MPM'
  | 'VOICE_CALL'

function normalizeButtons(input: any[]): any[] {
  const list = Array.isArray(input) ? input : []
  const quickReplies = list.filter((b) => b?.type === 'QUICK_REPLY')
  const others = list.filter((b) => b?.type !== 'QUICK_REPLY')
  return [...quickReplies, ...others]
}

function countButtonsByType(buttons: any[], type: ButtonType): number {
  return (Array.isArray(buttons) ? buttons : []).filter((b) => b?.type === type).length
}

function countChars(value: unknown): number {
  return String(value ?? '').length
}

function clampText(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max)
}

function splitPhone(phone: string): { country: string; number: string } {
  const raw = String(phone || '').replace(/\s+/g, '')
  const digits = raw.replace(/\D+/g, '')
  if (!digits) return { country: '55', number: '' }
  if (digits.startsWith('55')) return { country: '55', number: digits.slice(2) }
  if (digits.startsWith('1')) return { country: '1', number: digits.slice(1) }
  return { country: '55', number: digits }
}

function joinPhone(country: string, number: string): string {
  const c = String(country || '').replace(/\D+/g, '')
  const n = String(number || '').replace(/\D+/g, '')
  return `${c}${n}`
}

function newButtonForType(type: ButtonType): any {
  if (type === 'URL') return { type, text: '', url: 'https://' }
  if (type === 'PHONE_NUMBER') return { type, text: '', phone_number: '' }
  if (type === 'COPY_CODE') return { type, example: 'CODE123' }
  if (type === 'OTP') return { type, otp_type: 'COPY_CODE', text: '' }
  if (type === 'FLOW') return { type, text: '', flow_id: '', flow_action: 'navigate' }
  return { type, text: '' }
}

function ensureBaseSpec(input: unknown): Spec {
  const s = (input && typeof input === 'object') ? { ...(input as any) } : {}
  if (!s.name) s.name = 'novo_template'
  if (!s.language) s.language = 'pt_BR'
  if (!s.category) s.category = 'MARKETING'
  if (!s.parameter_format) s.parameter_format = 'positional'

  // body/content
  if (!s.body && typeof s.content === 'string') s.body = { text: s.content }
  if (!s.body) s.body = { text: '' }

  if (s.header === undefined) s.header = null
  if (s.footer === undefined) s.footer = null
  if (s.buttons === undefined) s.buttons = []
  if (s.carousel === undefined) s.carousel = null
  if (s.limited_time_offer === undefined) s.limited_time_offer = null

  return s
}

function variableCount(text: string): number {
  const matches = text.match(/\{\{[^}]+\}\}/g) || []
  const unique = new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))
  return unique.size
}

function nextPositionalVariable(text: string): number {
  // Encontra o maior {{n}} no texto e retorna n+1.
  // Se não houver, começa em 1.
  const matches = text.match(/\{\{\s*(\d+)\s*\}\}/g) || []
  let max = 0
  for (const m of matches) {
    const num = Number(m.replace(/\D+/g, ''))
    if (!Number.isNaN(num)) max = Math.max(max, num)
  }
  return max + 1
}

function wrapSelection(value: string, start: number, end: number, left: string, right = left) {
  const before = value.slice(0, start)
  const mid = value.slice(start, end)
  const after = value.slice(end)
  return {
    value: `${before}${left}${mid}${right}${after}`,
    nextStart: start + left.length,
    nextEnd: end + left.length,
  }
}

function insertAt(value: string, pos: number, insert: string) {
  return {
    value: `${value.slice(0, pos)}${insert}${value.slice(pos)}`,
    nextPos: pos + insert.length,
  }
}

function defaultBodyExamples(text: string): string[][] | undefined {
  const n = variableCount(text)
  if (n <= 0) return undefined
  const row = Array.from({ length: n }, (_, i) => `Exemplo ${i + 1}`)
  return [row]
}

function Preview({ spec }: { spec: Spec }) {
  const header = spec.header
  const bodyText = spec.body?.text || ''
  const footerText = spec.footer?.text || ''
  const buttons: any[] = Array.isArray(spec.buttons) ? spec.buttons : []

  const prettyButtonLabel = (b: any): string => {
    const t = String(b?.type || '')
    if (t === 'COPY_CODE') return b?.text || 'Copiar código'
    if (t === 'QUICK_REPLY') return b?.text || 'Quick Reply'
    return b?.text || t
  }

  const headerLabel = (() => {
    if (!header) return null
    if (header.format === 'TEXT') return header.text || ''
    if (header.format === 'LOCATION') return 'LOCALIZAÇÃO'
    return `MÍDIA (${header.format})`
  })()

  return (
    <div className="glass-panel rounded-xl p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="text-sm font-semibold text-white">Prévia do modelo</div>
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 bg-zinc-900 hover:bg-white/5 text-gray-200"
          title="Visualizar"
        >
          <Play className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* “telefone” */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#efeae2]">
            {/* header da conversa */}
            <div className="h-11 px-3 flex items-center gap-2 bg-[#075e54] text-white">
              <div className="h-7 w-7 rounded-full bg-white/20" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold leading-none truncate">Business</div>
                <div className="text-[10px] text-white/80 leading-none mt-0.5 truncate">template</div>
              </div>
            </div>

            {/* conversa */}
            <div className="p-3">
              <div className="max-w-90 rounded-xl bg-white text-zinc-900 shadow-sm overflow-hidden">
                <div className="px-3 py-2">
                {headerLabel ? (
                  <div className="text-[13px] font-semibold leading-snug">
                    {headerLabel}
                  </div>
                ) : null}

                <div className="text-[13px] leading-snug whitespace-pre-wrap">
                  {bodyText || <span className="text-zinc-400">Digite o corpo para ver a prévia.</span>}
                </div>

                {footerText ? (
                  <div className="mt-1 text-[11px] text-zinc-500 whitespace-pre-wrap">
                    {footerText}
                  </div>
                ) : null}

                <div className="mt-1 flex items-center justify-end text-[10px] text-zinc-400">
                  16:34
                </div>
                </div>

                {buttons.length > 0 ? (
                  <div className="border-t border-zinc-200">
                    {buttons.map((b, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'px-3 py-3 text-center text-[13px] font-medium text-blue-600 flex items-center justify-center gap-2',
                          idx > 0 ? 'border-t border-zinc-200' : ''
                        )}
                      >
                        {String(b?.type || '') === 'URL' ? (
                          <ExternalLink className="w-4 h-4" />
                        ) : String(b?.type || '') === 'QUICK_REPLY' ? (
                          <CornerDownLeft className="w-4 h-4" />
                        ) : null}
                        <span>{prettyButtonLabel(b)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ManualTemplateBuilder({
  id,
  initialSpec,
  onSpecChange,
}: {
  id: string
  initialSpec: unknown
  onSpecChange: (spec: unknown) => void
}) {
  const [spec, setSpec] = React.useState<Spec>(() => ensureBaseSpec(initialSpec))
  const [showDebug, setShowDebug] = React.useState(false)

  const headerTextRef = React.useRef<HTMLInputElement | null>(null)
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null)
  const footerRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    setSpec(ensureBaseSpec(initialSpec))
  }, [initialSpec])

  const update = (patch: Partial<Spec>) => {
    setSpec((prev: any) => {
      const next = { ...prev, ...patch }
      onSpecChange(next)
      return next
    })
  }

  const updateHeader = (patch: any) => {
    setSpec((prev: any) => {
      const next = { ...prev, header: patch }
      onSpecChange(next)
      return next
    })
  }

  const updateFooter = (patch: any) => {
    setSpec((prev: any) => {
      const next = { ...prev, footer: patch }
      onSpecChange(next)
      return next
    })
  }

  const updateButtons = (buttons: any[]) => {
    setSpec((prev: any) => {
      const next = { ...prev, buttons: normalizeButtons(buttons) }
      onSpecChange(next)
      return next
    })
  }

  const header: any = spec.header
  const buttons: any[] = Array.isArray(spec.buttons) ? spec.buttons : []

  const maxButtons = 10
  const maxButtonText = 25
  const counts = {
    total: buttons.length,
    url: countButtonsByType(buttons, 'URL'),
    phone: countButtonsByType(buttons, 'PHONE_NUMBER'),
    copyCode: countButtonsByType(buttons, 'COPY_CODE'),
  }

  const canAddButtonType = (type: ButtonType): { ok: boolean; reason?: string } => {
    if (counts.total >= maxButtons) return { ok: false, reason: 'Limite de 10 botões atingido.' }
    if (type === 'URL' && counts.url >= 2) return { ok: false, reason: 'Limite de 2 botões de URL.' }
    if (type === 'PHONE_NUMBER' && counts.phone >= 1) return { ok: false, reason: 'Limite de 1 botão de telefone.' }
    if (type === 'COPY_CODE' && counts.copyCode >= 1) return { ok: false, reason: 'Limite de 1 botão de copiar código.' }
    return { ok: true }
  }

  const addButton = (type: ButtonType) => {
    const gate = canAddButtonType(type)
    if (!gate.ok) return
    updateButtons([...buttons, newButtonForType(type)])
  }

  const variableMode: 'positional' | 'named' = spec.parameter_format || 'positional'

  const addVariable = (target: 'header' | 'body' | 'footer') => {
    const currentText =
      target === 'header'
        ? String(header?.text || '')
        : target === 'footer'
          ? String(spec.footer?.text || '')
          : String(spec.body?.text || '')

    const placeholder = (() => {
      if (variableMode === 'positional') {
        const next = nextPositionalVariable(currentText)
        return `{{${next}}}`
      }

      const name = window.prompt('Nome da variável (ex: first_name)')
      if (!name) return null
      const trimmed = name.trim()
      if (!trimmed) return null
      return `{{${trimmed}}}`
    })()

    if (!placeholder) return

    if (target === 'header') {
      const el = headerTextRef.current
      const start = el?.selectionStart ?? currentText.length
      const { value, nextPos } = insertAt(currentText, start, placeholder)
      updateHeader({ ...(header || { format: 'TEXT' }), format: 'TEXT', text: value, example: header?.example ?? null })
      requestAnimationFrame(() => {
        if (!el) return
        el.focus()
        el.setSelectionRange(nextPos, nextPos)
      })
      return
    }

    if (target === 'footer') {
      const el = footerRef.current
      const start = el?.selectionStart ?? currentText.length
      const { value, nextPos } = insertAt(currentText, start, placeholder)
      updateFooter({ ...(spec.footer || {}), text: value })
      requestAnimationFrame(() => {
        if (!el) return
        el.focus()
        el.setSelectionRange(nextPos, nextPos)
      })
      return
    }

    // body
    const el = bodyRef.current
    const start = el?.selectionStart ?? currentText.length
    const { value, nextPos } = insertAt(currentText, start, placeholder)
    const example = defaultBodyExamples(value)
    update({ body: { ...(spec.body || {}), text: value, example: example ? { body_text: example } : undefined } })
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(nextPos, nextPos)
    })
  }

  const applyBodyFormat = (kind: 'bold' | 'italic' | 'strike' | 'code') => {
    const el = bodyRef.current
    const value = String(spec.body?.text || '')
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const token = kind === 'bold' ? '*' : kind === 'italic' ? '_' : kind === 'strike' ? '~' : '`'
    const { value: nextValue, nextStart, nextEnd } = wrapSelection(value, start, end, token)
    const example = defaultBodyExamples(nextValue)
    update({ body: { ...(spec.body || {}), text: nextValue, example: example ? { body_text: example } : undefined } })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(nextStart, nextEnd)
    })
  }

  const headerEnabled = !!spec.header
  const headerType: HeaderFormat | 'NONE' = headerEnabled ? (header?.format || 'TEXT') : 'NONE'
  const bodyText: string = String(spec.body?.text || '')
  const footerText: string = String(spec.footer?.text || '')
  const headerText: string = String(header?.text || '')

  const headerTextCount = headerText.length
  const bodyTextCount = bodyText.length
  const footerTextCount = footerText.length

  const canShowMediaSample = headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
      <div className="space-y-6">
        {/* CONFIG (equivalente ao passo anterior na Meta, mas mantemos aqui) */}
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-white">Nome e idioma do modelo</div>
              <div className="text-xs text-gray-400 mt-0.5">Defina como o modelo será identificado.</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Nome</label>
              <Input
                value={spec.name || ''}
                onChange={(e) => update({ name: e.target.value })}
                className="bg-zinc-900 border-white/10 text-white"
              />
              <p className="text-xs text-gray-500">Apenas <span className="font-mono">a-z 0-9 _</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Categoria</label>
              <Select value={spec.category} onValueChange={(v) => update({ category: v })}>
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utilidade</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Idioma</label>
              <Select value={spec.language} onValueChange={(v) => update({ language: v })}>
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">pt_BR</SelectItem>
                  <SelectItem value="en_US">en_US</SelectItem>
                  <SelectItem value="es_ES">es_ES</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            ID do rascunho: <span className="font-mono">{id}</span>
          </div>
        </div>

        {/* CONTEÚDO (como na Meta) */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div>
            <div className="text-base font-semibold text-white">Conteúdo</div>
            <div className="text-xs text-gray-400 mt-1">
              Adicione um cabeçalho, corpo de texto e rodapé para o seu modelo. A Meta analisa variáveis e conteúdo antes da aprovação.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Tipo de variável</label>
              <Select
                value={variableMode}
                onValueChange={(v) => update({ parameter_format: v })}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positional">Número</SelectItem>
                  <SelectItem value="named">Nome (avançado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Amostra de mídia <span className="text-gray-500">• Opcional</span></label>
              <Select
                value={canShowMediaSample ? 'handle' : 'none'}
                onValueChange={() => {
                  // A seleção real é determinada pelo tipo de Header.
                  // Mantemos o controle aqui para espelhar a UX da Meta.
                }}
                disabled={!canShowMediaSample}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white disabled:opacity-60">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="handle">Usar header_handle</SelectItem>
                </SelectContent>
              </Select>
              {!canShowMediaSample ? (
                <div className="text-xs text-gray-500">Selecione um cabeçalho de mídia (Imagem/Vídeo/Documento) para ativar.</div>
              ) : null}
            </div>
          </div>

          {/* CABEÇALHO */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Cabeçalho <span className="text-xs text-gray-500 font-normal">• Opcional</span></div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Tipo</label>
                <Select
                  value={headerType}
                  onValueChange={(v) => {
                    const format = v as HeaderFormat | 'NONE'
                    if (format === 'NONE') {
                      update({ header: null })
                      return
                    }
                    if (format === 'TEXT') updateHeader({ format: 'TEXT', text: '', example: null })
                    else if (format === 'LOCATION') updateHeader({ format: 'LOCATION' })
                    else updateHeader({ format, example: { header_handle: [''] } })
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhum</SelectItem>
                    <SelectItem value="TEXT">Texto</SelectItem>
                    <SelectItem value="IMAGE">Imagem</SelectItem>
                    <SelectItem value="VIDEO">Vídeo</SelectItem>
                    <SelectItem value="DOCUMENT">Documento</SelectItem>
                    <SelectItem value="LOCATION">Localização</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {headerType === 'TEXT' ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-300">Cabeçalho</label>
                  <div className="text-xs text-gray-500">{headerTextCount}/60</div>
                </div>
                <Input
                  ref={headerTextRef as any}
                  value={headerText}
                  onChange={(e) => updateHeader({ ...header, format: 'TEXT', text: e.target.value })}
                  className="bg-zinc-900 border-white/10 text-white"
                  placeholder="Adicione uma pequena linha de texto (opcional)"
                  maxLength={60}
                />
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => addVariable('header')}
                    className="h-8 px-2 text-gray-300 hover:bg-white/5"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar variável
                  </Button>
                </div>
              </div>
            ) : null}

            {canShowMediaSample ? (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-medium text-gray-300">header_handle (mídia)</label>
                <Input
                  value={header?.example?.header_handle?.[0] || ''}
                  onChange={(e) => updateHeader({ ...header, example: { ...(header.example || {}), header_handle: [e.target.value] } })}
                  className="bg-zinc-900 border-white/10 text-white"
                  placeholder="Cole o header_handle (upload resumable: em breve)"
                />
                <p className="text-xs text-gray-500">
                  Por enquanto, cole o <span className="font-mono">header_handle</span>. Depois a gente automatiza o upload.
                </p>
              </div>
            ) : null}
          </div>

          {/* CORPO */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Corpo</div>
              <div className="text-xs text-gray-500">{bodyTextCount}/1024</div>
            </div>

            <div className="mt-2 rounded-xl border border-white/10 bg-zinc-950">
              <div className="p-2">
                <Textarea
                  ref={bodyRef as any}
                  value={bodyText}
                  onChange={(e) => {
                    const text = e.target.value
                    const example = defaultBodyExamples(text)
                    update({ body: { ...(spec.body || {}), text, example: example ? { body_text: example } : undefined } })
                  }}
                  className="bg-transparent border-none text-white min-h-36 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Digite o texto do corpo (obrigatório)"
                  maxLength={1024}
                />
              </div>

              <div className="flex items-center gap-1 px-2 py-2 border-t border-white/10">
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('bold')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('italic')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('strike')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Strikethrough className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('code')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Code className="w-4 h-4" />
                </Button>

                <div className="flex-1" />

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => addVariable('body')}
                  className="h-8 px-2 text-gray-200 hover:bg-white/5"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar variável
                </Button>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Variáveis detectadas: <span className="font-mono">{variableCount(bodyText)}</span>
              {!bodyText.trim() ? <span className="text-amber-300"> • O corpo é obrigatório.</span> : null}
            </div>
          </div>

          {/* RODAPÉ */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Rodapé <span className="text-xs text-gray-500 font-normal">• Opcional</span></div>
              <div className="text-xs text-gray-500">{footerTextCount}/60</div>
            </div>

            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-white/10 bg-zinc-900 hover:bg-white/5"
                  onClick={() => updateFooter(spec.footer ? null : { text: '' })}
                >
                  {spec.footer ? 'Remover rodapé' : 'Adicionar rodapé'}
                </Button>
              </div>

              {spec.footer ? (
                <div className="space-y-2">
                  <Input
                    ref={footerRef as any}
                    value={footerText}
                    onChange={(e) => updateFooter({ ...(spec.footer || {}), text: e.target.value })}
                    className="bg-zinc-900 border-white/10 text-white"
                    placeholder="Inserir texto"
                    maxLength={60}
                  />
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => addVariable('footer')}
                      className="h-8 px-2 text-gray-300 hover:bg-white/5"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar variável
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Botões <span className="text-xs text-gray-500 font-normal">• Opcional</span></div>
              <div className="text-xs text-gray-400">É possível adicionar até 10 botões. Se adicionar mais de 3, eles aparecem em lista.</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-white/10 bg-zinc-900 hover:bg-white/5"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar botão
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-60">
                <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">
                  Ações
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => addButton('QUICK_REPLY')}
                  disabled={!canAddButtonType('QUICK_REPLY').ok}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                >
                  Resposta rápida
                  <DropdownMenuShortcut>até 10</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => addButton('URL')}
                  disabled={!canAddButtonType('URL').ok}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                >
                  Visitar site
                  <DropdownMenuShortcut>máx 2</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => addButton('PHONE_NUMBER')}
                  disabled={!canAddButtonType('PHONE_NUMBER').ok}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                >
                  Ligar
                  <DropdownMenuShortcut>máx 1</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => addButton('COPY_CODE')}
                  disabled={!canAddButtonType('COPY_CODE').ok}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                >
                  Copiar código
                  <DropdownMenuShortcut>máx 1</DropdownMenuShortcut>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                    Avançado
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-zinc-900 border-white/10 text-white min-w-56">
                    <DropdownMenuItem
                      onClick={() => addButton('FLOW')}
                      disabled={!canAddButtonType('FLOW').ok}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                    >
                      Flow
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => addButton('OTP')}
                      disabled={!canAddButtonType('OTP').ok}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                    >
                      OTP
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => addButton('CATALOG')}
                      disabled={!canAddButtonType('CATALOG').ok}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                    >
                      Catálogo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => addButton('MPM')}
                      disabled={!canAddButtonType('MPM').ok}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                    >
                      MPM
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => addButton('VOICE_CALL')}
                      disabled={!canAddButtonType('VOICE_CALL').ok}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                    >
                      Chamada de voz
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {buttons.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum botão</div>
          ) : (
            <div className="space-y-5">
              {/* Resposta rápida */}
              {(() => {
                const rows = buttons
                  .map((b, idx) => ({ b, idx }))
                  .filter(({ b }) => b?.type === 'QUICK_REPLY')

                if (rows.length === 0) return null

                return (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-400">Resposta rápida <span className="text-gray-500">• Opcional</span></div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="grid grid-cols-[18px_minmax(0,1fr)_40px] gap-3 items-center">
                        <div />
                        <div className="text-xs font-medium text-gray-300">Texto do botão</div>
                        <div />
                      </div>

                      <div className="mt-3 space-y-3">
                        {rows.map(({ b, idx }) => {
                          const text = String(b?.text || '')
                          return (
                            <div key={idx} className="grid grid-cols-[18px_minmax(0,1fr)_40px] gap-3 items-center">
                              <GripVertical className="w-4 h-4 text-gray-500" />

                              <div className="relative">
                                <Input
                                  value={text}
                                  onChange={(e) => {
                                    const next = [...buttons]
                                    next[idx] = { ...b, text: clampText(e.target.value, maxButtonText) }
                                    updateButtons(next)
                                  }}
                                  className="h-11 bg-zinc-900 border-white/10 text-white pr-16"
                                  maxLength={maxButtonText}
                                  placeholder="Quick Reply"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                  {countChars(text)}/{maxButtonText}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => updateButtons(buttons.filter((_, i) => i !== idx))}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/5"
                                title="Remover"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Chamada para ação */}
              {(() => {
                const rows = buttons
                  .map((b, idx) => ({ b, idx }))
                  .filter(({ b }) => b?.type !== 'QUICK_REPLY')

                if (rows.length === 0) return null

                return (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-400">Chamada para ação <span className="text-gray-500">• Opcional</span></div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                      {rows.map(({ b, idx }) => {
                        const type = b?.type as ButtonType
                        const buttonText = String(b?.text || '')

                        const headerRow = (
                          <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-4">
                            <div className="pt-6">
                              <GripVertical className="w-4 h-4 text-gray-500" />
                            </div>

                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">Tipo de ação</div>
                                  <Select
                                    value={type}
                                    onValueChange={(v) => {
                                      const t = v as ButtonType
                                      const next = [...buttons]
                                      next[idx] = { type: t }
                                      if (t === 'QUICK_REPLY' || t === 'URL' || t === 'PHONE_NUMBER' || t === 'FLOW' || t === 'CATALOG' || t === 'MPM' || t === 'VOICE_CALL') {
                                        next[idx].text = ''
                                      }
                                      if (t === 'URL') next[idx].url = 'https://'
                                      if (t === 'PHONE_NUMBER') next[idx].phone_number = ''
                                      if (t === 'COPY_CODE') next[idx].example = 'CODE123'
                                      if (t === 'OTP') next[idx].otp_type = 'COPY_CODE'
                                      if (t === 'FLOW') next[idx].flow_id = ''
                                      updateButtons(next)
                                    }}
                                  >
                                    <SelectTrigger className="h-11 w-full bg-zinc-900 border-white/10 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="URL">Acessar o site</SelectItem>
                                      <SelectItem value="PHONE_NUMBER">Ligar</SelectItem>
                                      <SelectItem value="COPY_CODE">Copiar código da oferta</SelectItem>
                                      <SelectItem value="FLOW">Concluir flow</SelectItem>
                                      <SelectItem value="VOICE_CALL">Ligar no WhatsApp</SelectItem>
                                      <SelectItem value="CATALOG">Catálogo</SelectItem>
                                      <SelectItem value="MPM">MPM</SelectItem>
                                      <SelectItem value="OTP">OTP</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">Texto do botão</div>
                                  <div className="relative">
                                    <Input
                                      value={buttonText}
                                      onChange={(e) => {
                                        const next = [...buttons]
                                        next[idx] = { ...b, text: clampText(e.target.value, maxButtonText) }
                                        updateButtons(next)
                                      }}
                                      className="h-11 bg-zinc-900 border-white/10 text-white pr-16"
                                      maxLength={maxButtonText}
                                      placeholder={type === 'URL' ? 'Visualizar' : 'Texto'}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                      {countChars(buttonText)}/{maxButtonText}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )

                        const bodyRow = (() => {
                          if (type === 'URL') {
                            const url = String(b?.url || '')
                            const isDynamic = /\{\{\s*\d+\s*\}\}/.test(url)
                            const example = (Array.isArray(b?.example) ? b.example[0] : b?.example) || ''

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">Tipo de URL</div>
                                  <Select
                                    value={isDynamic ? 'dynamic' : 'static'}
                                    onValueChange={(v) => {
                                      const next = [...buttons]
                                      const nextUrl = v === 'dynamic'
                                        ? (url.includes('{{') ? url : `${url.replace(/\/$/, '')}/{{1}}`)
                                        : url.replace(/\{\{\s*\d+\s*\}\}/g, '').replace(/\/+$/, '')
                                      next[idx] = { ...b, url: nextUrl }
                                      if (v !== 'dynamic') {
                                        delete next[idx].example
                                      } else {
                                        next[idx].example = Array.isArray(b?.example) ? b.example : [example || 'Exemplo 1']
                                      }
                                      updateButtons(next)
                                    }}
                                  >
                                    <SelectTrigger className="h-11 w-full bg-zinc-900 border-white/10 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="static">Estático</SelectItem>
                                      <SelectItem value="dynamic">Dinâmico</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">URL do site</div>
                                  <Input
                                    value={url}
                                    onChange={(e) => {
                                      const next = [...buttons]
                                      next[idx] = { ...b, url: e.target.value }
                                      updateButtons(next)
                                    }}
                                    className="h-11 bg-zinc-900 border-white/10 text-white"
                                    placeholder="https://www.exemplo.com"
                                  />
                                </div>

                                {isDynamic ? (
                                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium text-gray-300">Exemplo</div>
                                      <Input
                                        value={example}
                                        onChange={(e) => {
                                          const next = [...buttons]
                                          next[idx] = { ...b, example: [e.target.value] }
                                          updateButtons(next)
                                        }}
                                        className="h-11 bg-zinc-900 border-white/10 text-white"
                                        placeholder="Exemplo 1"
                                      />
                                    </div>
                                    <div className="text-xs text-gray-500 self-end">
                                      Use <span className="font-mono">{'{{1}}'}</span> para URL dinâmica.
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )
                          }

                          if (type === 'PHONE_NUMBER') {
                            const { country, number } = splitPhone(String(b?.phone_number || ''))
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">País</div>
                                  <Select
                                    value={country}
                                    onValueChange={(v) => {
                                      const next = [...buttons]
                                      next[idx] = { ...b, phone_number: joinPhone(v, number) }
                                      updateButtons(next)
                                    }}
                                  >
                                    <SelectTrigger className="h-11 w-full bg-zinc-900 border-white/10 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="55">BR +55</SelectItem>
                                      <SelectItem value="1">US +1</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">Telefone</div>
                                  <Input
                                    value={number}
                                    onChange={(e) => {
                                      const next = [...buttons]
                                      next[idx] = { ...b, phone_number: joinPhone(country, e.target.value) }
                                      updateButtons(next)
                                    }}
                                    className="h-11 bg-zinc-900 border-white/10 text-white"
                                    placeholder="(11) 99999-7777"
                                  />
                                </div>
                              </div>
                            )
                          }

                          if (type === 'COPY_CODE') {
                            const code = String((Array.isArray(b?.example) ? b.example[0] : b?.example) || '')
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">Código da oferta</div>
                                  <Input
                                    value={code}
                                    onChange={(e) => {
                                      const next = [...buttons]
                                      next[idx] = { ...b, example: clampText(e.target.value, 20) }
                                      updateButtons(next)
                                    }}
                                    className="h-11 bg-zinc-900 border-white/10 text-white"
                                    placeholder="1234"
                                  />
                                </div>
                                <div className="text-xs text-gray-500">
                                  O código é exibido ao usuário e pode ser copiado.
                                </div>
                              </div>
                            )
                          }

                          if (type === 'FLOW') {
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">flow_id</div>
                                  <Input
                                    value={b.flow_id || ''}
                                    onChange={(e) => {
                                      const next = [...buttons]
                                      next[idx] = { ...b, flow_id: e.target.value }
                                      updateButtons(next)
                                    }}
                                    className="h-11 bg-zinc-900 border-white/10 text-white"
                                    placeholder="Usar existente"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-300">flow_action</div>
                                  <Select
                                    value={b.flow_action || 'navigate'}
                                    onValueChange={(v) => {
                                      const next = [...buttons]
                                      next[idx] = { ...b, flow_action: v }
                                      updateButtons(next)
                                    }}
                                  >
                                    <SelectTrigger className="h-11 w-full bg-zinc-900 border-white/10 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="navigate">navigate</SelectItem>
                                      <SelectItem value="data_exchange">data_exchange</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )
                          }

                          return null
                        })()

                        return (
                          <div key={idx} className="relative rounded-xl border border-white/10 bg-zinc-950/20 p-5">
                            <button
                              type="button"
                              onClick={() => updateButtons(buttons.filter((_, i) => i !== idx))}
                              className="absolute right-4 top-4 h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/5"
                              title="Remover"
                              aria-label="Remover"
                            >
                              <X className="w-4 h-4" />
                            </button>

                            <div className="space-y-4">
                              {headerRow}
                              {bodyRow ? (
                                <div className="pl-8.5">
                                  {bodyRow}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}

                      <div className="text-xs text-gray-500">
                        Regras: URL máx 2, Ligar máx 1, Copiar código máx 1; Respostas rápidas ficam agrupadas.
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {counts.total >= maxButtons ? (
            <div className="text-xs text-amber-300">
              Você já atingiu o limite de {maxButtons} botões.
            </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-xl p-4">
          <details>
            <summary className="cursor-pointer list-none select-none flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Avançado</div>
                <div className="text-xs text-gray-400">Opções menos comuns (LTO, Auth e Carousel).</div>
              </div>
              <div className="text-xs text-gray-500">Abrir</div>
            </summary>

            <div className="mt-4 space-y-4">
              {spec.category === 'MARKETING' ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-sm font-semibold text-white">Limited Time Offer</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-white/10 bg-zinc-900 hover:bg-white/5"
                      onClick={() => update({ limited_time_offer: spec.limited_time_offer ? null : { text: '', has_expiration: true } })}
                    >
                      {spec.limited_time_offer ? 'Remover' : 'Adicionar'}
                    </Button>
                  </div>
                  {spec.limited_time_offer ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">Texto (máx 16)</label>
                        <Input
                          value={spec.limited_time_offer.text || ''}
                          onChange={(e) => update({ limited_time_offer: { ...(spec.limited_time_offer || {}), text: e.target.value } })}
                          className="bg-zinc-900 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">has_expiration</label>
                        <Select
                          value={String(!!spec.limited_time_offer.has_expiration)}
                          onValueChange={(v) => update({ limited_time_offer: { ...(spec.limited_time_offer || {}), has_expiration: v === 'true' } })}
                        >
                          <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">true</SelectItem>
                            <SelectItem value="false">false</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {spec.category === 'AUTHENTICATION' ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-sm font-semibold text-white">Autenticação (Auth)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">message_send_ttl_seconds</label>
                      <Input
                        value={spec.message_send_ttl_seconds ?? ''}
                        onChange={(e) => update({ message_send_ttl_seconds: e.target.value ? Number(e.target.value) : undefined })}
                        className="bg-zinc-900 border-white/10 text-white"
                        placeholder="ex: 300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">add_security_recommendation</label>
                      <Select
                        value={String(!!spec.add_security_recommendation)}
                        onValueChange={(v) => update({ add_security_recommendation: v === 'true' })}
                      >
                        <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">true</SelectItem>
                          <SelectItem value="false">false</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">code_expiration_minutes</label>
                      <Input
                        value={spec.code_expiration_minutes ?? ''}
                        onChange={(e) => update({ code_expiration_minutes: e.target.value ? Number(e.target.value) : undefined })}
                        className="bg-zinc-900 border-white/10 text-white"
                        placeholder="ex: 10"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {spec.category !== 'MARKETING' && spec.category !== 'AUTHENTICATION' ? (
                <div className="text-xs text-gray-500">
                  Sem opções avançadas específicas para esta categoria.
                </div>
              ) : null}

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm font-semibold text-white">Carousel</div>
                <div className="text-xs text-gray-400">
                  Editor visual completo do Carousel vem depois. Por enquanto, você pode colar o JSON.
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-300">JSON (carousel)</label>
                  <Textarea
                    value={spec.carousel ? JSON.stringify(spec.carousel, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        const val = e.target.value.trim()
                        update({ carousel: val ? JSON.parse(val) : null })
                      } catch {
                        // não travar digitando
                      }
                    }}
                    className="bg-zinc-900 border-white/10 text-white min-h-28 font-mono text-xs"
                    placeholder="Cole aqui um JSON de carousel (opcional)"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="space-y-6 lg:sticky lg:top-6 self-start">
        <Preview spec={spec} />

        <div className="glass-panel rounded-xl p-4">
          <details>
            <summary className="cursor-pointer list-none select-none flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Avançado</div>
              <div className="text-xs text-gray-400">Abrir</div>
            </summary>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowDebug((v) => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="text-sm font-semibold text-white">Debug</div>
                <div className="text-xs text-gray-400">{showDebug ? 'Ocultar' : 'Ver JSON'}</div>
              </button>
              {showDebug ? (
                <pre className="mt-3 text-xs text-gray-300 font-mono whitespace-pre-wrap wrap-break-word">
                  {JSON.stringify(spec, null, 2)}
                </pre>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
