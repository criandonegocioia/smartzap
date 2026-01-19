/**
 * T055: Test AI Agent endpoint
 * Allows testing an agent with a sample message before activation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const testMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória').max(2000),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const body = await request.json()

    // Validate body
    const parsed = testMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { message } = parsed.data

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      )
    }

    // Import AI dependencies dynamically
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
    const { generateText } = await import('ai')

    // Get Gemini API key
    const { data: settings } = await supabase
      .from('settings')
      .select('gemini_api_key')
      .single()

    const apiKey = settings?.gemini_api_key || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key do Gemini não configurada' },
        { status: 500 }
      )
    }

    // Create Google provider
    const google = createGoogleGenerativeAI({ apiKey })

    // Generate response
    const startTime = Date.now()

    const result = await generateText({
      model: google(agent.model || 'gemini-2.0-flash'),
      system: agent.system_prompt,
      prompt: message,
      temperature: agent.temperature ?? 0.7,
      maxOutputTokens: agent.max_tokens ?? 1024,
    })

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      response: result.text,
      latency_ms: latencyMs,
      model: agent.model,
      usage: result.usage ? {
        promptTokens: result.usage.inputTokens,
        completionTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
      } : undefined,
    })
  } catch (error) {
    console.error('[ai-agents/test] Error:', error)

    // Handle AI SDK specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Erro de autenticação com o modelo de IA' },
          { status: 401 }
        )
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erro ao testar agente' },
      { status: 500 }
    )
  }
}
