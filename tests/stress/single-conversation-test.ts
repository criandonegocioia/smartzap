#!/usr/bin/env tsx
/**
 * Teste de Conversa Completa (Multi-turno)
 *
 * Simula uma conversa real: saudação → perguntas → encerramento
 */

import { generateWebhookPayload, generateUniquePhone } from './webhook-payload'

const TARGET_URL = process.argv[2] || 'http://localhost:3000/api/webhook'

// Fluxo de conversa realista
const CONVERSATION_FLOW = [
  { message: 'Oi, tudo bem?', waitAfter: 2000, description: 'Saudação inicial' },
  { message: 'Qual o horário de funcionamento?', waitAfter: 3000, description: 'Pergunta sobre horário' },
  { message: 'Vocês entregam?', waitAfter: 3000, description: 'Pergunta sobre entrega' },
  { message: 'Quanto custa o frete?', waitAfter: 3000, description: 'Pergunta sobre preço' },
  { message: 'Aceita cartão de crédito?', waitAfter: 3000, description: 'Pergunta sobre pagamento' },
  { message: 'Ok, vou pensar. Obrigado!', waitAfter: 2000, description: 'Encerramento' },
]

interface TurnResult {
  turn: number
  message: string
  description: string
  status: number
  latency: number
  success: boolean
  error?: string
}

async function sendMessage(phone: string, message: string): Promise<{ status: number; latency: number; error?: string }> {
  const payload = generateWebhookPayload({ phone, message })
  const start = Date.now()

  try {
    const response = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Stress-Test': 'single-conversation',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    })

    const latency = Date.now() - start

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return { status: response.status, latency, error: body.error || body.message }
    }

    return { status: response.status, latency }
  } catch (error) {
    const latency = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { status: 0, latency, error: errorMessage }
  }
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

async function runConversation(): Promise<void> {
  const phone = generateUniquePhone(Math.floor(Math.random() * 10000))
  const results: TurnResult[] = []

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              TESTE DE CONVERSA COMPLETA (MULTI-TURNO)            ║
╠══════════════════════════════════════════════════════════════════╣
║  Target:   ${TARGET_URL.padEnd(52)}║
║  Telefone: ${phone.padEnd(52)}║
║  Turnos:   ${CONVERSATION_FLOW.length.toString().padEnd(52)}║
╚══════════════════════════════════════════════════════════════════╝
`)

  const conversationStart = Date.now()

  for (let i = 0; i < CONVERSATION_FLOW.length; i++) {
    const turn = CONVERSATION_FLOW[i]
    const turnNumber = i + 1

    // Indicador visual
    process.stdout.write(`\n[Turno ${turnNumber}/${CONVERSATION_FLOW.length}] ${turn.description}\n`)
    process.stdout.write(`   📤 Usuário: "${turn.message}"\n`)
    process.stdout.write(`   ⏳ Aguardando resposta...`)

    // Envia mensagem
    const result = await sendMessage(phone, turn.message)

    // Resultado
    const icon = result.status === 200 ? '✅' : '❌'
    process.stdout.write(`\r   ${icon} Resposta: HTTP ${result.status} em ${formatLatency(result.latency)}\n`)

    if (result.error) {
      console.log(`   ⚠️  Erro: ${result.error}`)
    }

    results.push({
      turn: turnNumber,
      message: turn.message,
      description: turn.description,
      status: result.status,
      latency: result.latency,
      success: result.status === 200,
      error: result.error,
    })

    // Aguarda antes do próximo turno (simula tempo de leitura + digitação)
    if (i < CONVERSATION_FLOW.length - 1) {
      process.stdout.write(`   ⏸️  Aguardando ${turn.waitAfter / 1000}s antes do próximo turno...\n`)
      await new Promise(resolve => setTimeout(resolve, turn.waitAfter))
    }
  }

  const totalTime = Date.now() - conversationStart

  // Relatório final
  const successCount = results.filter(r => r.success).length
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length
  const maxLatency = Math.max(...results.map(r => r.latency))
  const minLatency = Math.min(...results.map(r => r.latency))

  console.log(`
════════════════════════════════════════════════════════════════════
                         RELATÓRIO FINAL
════════════════════════════════════════════════════════════════════

📊 RESUMO DA CONVERSA
────────────────────────────────────────────────────────────────────
  Telefone:            ${phone}
  Total de turnos:     ${results.length}
  Turnos com sucesso:  ${successCount}/${results.length} (${((successCount / results.length) * 100).toFixed(0)}%)
  Tempo total:         ${formatLatency(totalTime)}

⏱️  LATÊNCIA
────────────────────────────────────────────────────────────────────
  Mínima:   ${formatLatency(minLatency)}
  Máxima:   ${formatLatency(maxLatency)}
  Média:    ${formatLatency(Math.round(avgLatency))}

📝 DETALHES POR TURNO
────────────────────────────────────────────────────────────────────`)

  for (const r of results) {
    const icon = r.success ? '✅' : '❌'
    console.log(`  ${icon} Turno ${r.turn}: ${formatLatency(r.latency).padStart(8)} | "${r.message}"`)
  }

  console.log(`
════════════════════════════════════════════════════════════════════
`)

  // Exit code baseado no sucesso
  if (successCount < results.length) {
    process.exit(1)
  }
}

// Executa
console.log('\n🚀 Iniciando teste de conversa completa...\n')
runConversation().catch(error => {
  console.error('Erro fatal:', error)
  process.exit(1)
})
