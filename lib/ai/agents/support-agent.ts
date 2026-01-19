/**
 * T043-T045, T049: Support Agent
 * AI agent for automated customer support with:
 * - Tool calling (generateText with maxSteps)
 * - Debounce logic for consecutive messages
 * - Retry logic with auto-handoff on failure
 * - AI log persistence
 */

import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import {
  getGeminiModel,
  DEFAULT_MODEL_ID,
  DEFAULT_CALL_OPTIONS,
  supportResponseSchema,
  type SupportResponse,
  type CallOptions,
} from '../model'
import type { AIAgent, InboxConversation, InboxMessage } from '@/types'

// =============================================================================
// Types
// =============================================================================

export interface SupportAgentConfig {
  /** AI Agent configuration from database */
  agent: AIAgent
  /** Conversation context */
  conversation: InboxConversation
  /** Recent messages for context */
  messages: InboxMessage[]
  /** Call options override */
  callOptions?: Partial<CallOptions>
}

export interface SupportAgentResult {
  success: boolean
  response?: SupportResponse
  error?: string
  /** Time taken in milliseconds */
  latencyMs: number
  /** Log ID for reference */
  logId?: string
}

// =============================================================================
// Debounce Manager
// =============================================================================

/**
 * Track pending responses to implement debounce
 * Key: conversationId, Value: timeout handle and last message timestamp
 */
const pendingResponses = new Map<
  string,
  {
    timeout: NodeJS.Timeout
    lastMessageAt: number
    messageIds: string[]
  }
>()

/**
 * Check if we should wait for more messages (debounce)
 * Returns true if we should delay processing
 */
export function shouldDebounce(
  conversationId: string,
  debounceSec: number = 5
): boolean {
  const pending = pendingResponses.get(conversationId)
  if (!pending) return false

  const elapsed = Date.now() - pending.lastMessageAt
  return elapsed < debounceSec * 1000
}

/**
 * Schedule agent processing with debounce
 * Returns a promise that resolves when processing should begin
 */
export function scheduleWithDebounce(
  conversationId: string,
  messageId: string,
  debounceSec: number = 5
): Promise<string[]> {
  return new Promise((resolve) => {
    const pending = pendingResponses.get(conversationId)

    // Clear existing timeout
    if (pending?.timeout) {
      clearTimeout(pending.timeout)
    }

    // Accumulate message IDs
    const messageIds = pending?.messageIds || []
    messageIds.push(messageId)

    // Set new timeout
    const timeout = setTimeout(() => {
      const accumulated = pendingResponses.get(conversationId)
      pendingResponses.delete(conversationId)
      resolve(accumulated?.messageIds || messageIds)
    }, debounceSec * 1000)

    pendingResponses.set(conversationId, {
      timeout,
      lastMessageAt: Date.now(),
      messageIds,
    })
  })
}

/**
 * Cancel pending debounce for a conversation
 */
export function cancelDebounce(conversationId: string): void {
  const pending = pendingResponses.get(conversationId)
  if (pending?.timeout) {
    clearTimeout(pending.timeout)
    pendingResponses.delete(conversationId)
  }
}

// =============================================================================
// System Prompt Builder
// =============================================================================

function buildSystemPrompt(agent: AIAgent, conversation: InboxConversation): string {
  const contactName = conversation.contact?.name || 'Cliente'

  return `${agent.system_prompt}

CONTEXTO DA CONVERSA:
- Nome do cliente: ${contactName}
- Telefone: ${conversation.phone}
- Prioridade: ${conversation.priority || 'normal'}
- Total de mensagens: ${conversation.total_messages}

INSTRUÇÕES IMPORTANTES:
1. Responda sempre em português do Brasil
2. Seja educado, profissional e empático
3. Se não souber a resposta, admita e ofereça alternativas
4. Detecte o sentimento do cliente (positivo, neutro, negativo, frustrado)
5. Se o cliente estiver frustrado ou pedir para falar com humano, defina shouldHandoff como true
6. Inclua as fontes utilizadas quando aplicável

CRITÉRIOS PARA TRANSFERÊNCIA (shouldHandoff = true):
- Cliente explicitamente pede para falar com atendente/humano
- Cliente expressa frustração repetida (3+ mensagens negativas)
- Assunto sensível (reclamação formal, problema financeiro, dados pessoais)
- Você não consegue ajudar após 2 tentativas
- Detecção de urgência real (emergência, prazo crítico)`
}

// =============================================================================
// AI Log Persistence (T049)
// =============================================================================

interface AILogData {
  conversationId: string
  agentId: string
  messageIds: string[]
  input: string
  output: SupportResponse | null
  sources: Array<{ title: string; content: string }> | null
  latencyMs: number
  error: string | null
  toolCalls: Array<{ name: string; args: unknown; result: unknown }> | null
}

async function persistAILog(data: AILogData): Promise<string | undefined> {
  try {
    const supabase = await createClient()

    const { data: log, error } = await supabase
      .from('ai_agent_logs')
      .insert({
        conversation_id: data.conversationId,
        ai_agent_id: data.agentId,
        input_message: data.input,
        output_message: data.output?.message || null,
        response_time_ms: data.latencyMs,
        model_used: DEFAULT_MODEL_ID,
        tokens_used: null, // AI SDK doesn't expose this easily
        sources_used: data.sources,
        error_message: data.error,
        metadata: {
          messageIds: data.messageIds,
          sentiment: data.output?.sentiment,
          confidence: data.output?.confidence,
          shouldHandoff: data.output?.shouldHandoff,
          handoffReason: data.output?.handoffReason,
          toolCalls: data.toolCalls,
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('[AI Log] Failed to persist:', error)
      return undefined
    }

    return log?.id
  } catch (err) {
    console.error('[AI Log] Error:', err)
    return undefined
  }
}

// =============================================================================
// Support Agent Core
// =============================================================================

/**
 * Process a conversation with the support agent
 * Implements retry logic (1x retry, then auto-handoff)
 */
export async function processSupportAgent(
  config: SupportAgentConfig
): Promise<SupportAgentResult> {
  const { agent, conversation, messages, callOptions } = config
  const startTime = Date.now()

  // Build conversation context from recent messages
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = messages
    .slice(-10) // Last 10 messages for context
    .map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))

  // Get the last user message for input logging
  const lastUserMessage = messages
    .filter((m) => m.direction === 'inbound')
    .slice(-1)[0]

  const input = lastUserMessage?.content || ''
  const messageIds = messages.map((m) => m.id)

  // Merge call options
  const options: CallOptions = {
    ...DEFAULT_CALL_OPTIONS,
    ...callOptions,
  }

  let attempt = 0
  const maxAttempts = 2
  let lastError: string | null = null
  let toolCalls: Array<{ name: string; args: unknown; result: unknown }> = []

  while (attempt < maxAttempts) {
    attempt++

    try {
      const model = getGeminiModel(agent.model || DEFAULT_MODEL_ID)

      const result = await generateText({
        model,
        system: buildSystemPrompt(agent, conversation),
        messages: conversationHistory,
        tools: {
          // Knowledge base search tool (placeholder for Google File Search)
          searchKnowledgeBase: tool({
            description: 'Busca informações na base de conhecimento do negócio',
            inputSchema: z.object({
              query: z.string().describe('Termo de busca'),
            }),
            execute: async ({ query }: { query: string }) => {
              // TODO: Integrate with Google File Search when available
              // For now, return empty results
              console.log('[AI Agent] Knowledge base search:', query)
              return {
                results: [] as string[],
                message: 'Base de conhecimento não configurada',
              }
            },
          }),
        },
        stopWhen: stepCountIs(5),
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      })

      // Collect tool calls from steps
      toolCalls = result.steps
        .flatMap((step) => step.toolCalls || [])
        .map((tc) => ({
          name: tc.toolName,
          args: 'args' in tc ? tc.args : {},
          result: tc.toolName, // Tool results are in toolResults
        }))

      // Parse the response as structured output
      // Since we're using generateText, we need to parse the text response
      let response: SupportResponse

      try {
        // Try to parse as JSON first (if model returned structured format)
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          response = supportResponseSchema.parse(JSON.parse(jsonMatch[0]))
        } else {
          // Fallback: create response from plain text
          response = {
            message: result.text,
            sentiment: 'neutral',
            confidence: 0.7,
            shouldHandoff: false,
          }
        }
      } catch {
        // If parsing fails, use plain text response
        response = {
          message: result.text,
          sentiment: 'neutral',
          confidence: 0.5,
          shouldHandoff: false,
        }
      }

      const latencyMs = Date.now() - startTime

      // Persist AI log
      const logId = await persistAILog({
        conversationId: conversation.id,
        agentId: agent.id,
        messageIds,
        input,
        output: response,
        sources: response.sources || null,
        latencyMs,
        error: null,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
      })

      return {
        success: true,
        response,
        latencyMs,
        logId,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[AI Agent] Attempt ${attempt} failed:`, lastError)

      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  // All attempts failed - create auto-handoff response
  const latencyMs = Date.now() - startTime

  const handoffResponse: SupportResponse = {
    message:
      'Desculpe, estou com dificuldades técnicas no momento. Vou transferir você para um de nossos atendentes.',
    sentiment: 'neutral',
    confidence: 0,
    shouldHandoff: true,
    handoffReason: `Erro técnico após ${maxAttempts} tentativas: ${lastError}`,
    handoffSummary: `Cliente estava conversando quando ocorreu erro técnico. Última mensagem: "${input.slice(0, 200)}"`,
  }

  // Persist error log
  const logId = await persistAILog({
    conversationId: conversation.id,
    agentId: agent.id,
    messageIds,
    input,
    output: handoffResponse,
    sources: null,
    latencyMs,
    error: lastError,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
  })

  return {
    success: false,
    response: handoffResponse,
    error: lastError || 'Max retries exceeded',
    latencyMs,
    logId,
  }
}

// =============================================================================
// Exports
// =============================================================================

export type { SupportResponse }
