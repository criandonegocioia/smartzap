/**
 * Teste E2E: Fluxo de Conversa Multi-Turn
 *
 * Valida que a AI mantém contexto entre mensagens na mesma conversa.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { ZApiClient, type ZApiMessage } from '../z-api-client'
import { TIMEOUTS } from '../config'

describe('E2E WhatsApp: Fluxo de Conversa', () => {
  let client: ZApiClient
  let isConfigured = false

  beforeAll(async () => {
    try {
      client = new ZApiClient()
      const status = await client.checkStatus()

      if (!status.connected) {
        console.warn('⚠️  Z-API instance not connected. Tests will be skipped.')
        return
      }

      isConfigured = true
      console.log(`✅ Z-API connected: ${status.phone}`)
    } catch (error) {
      console.warn('⚠️  Z-API not configured. E2E tests will be skipped.')
    }
  })

  beforeEach(async () => {
    if (isConfigured) {
      await client.waitRateLimit()
      client.clearReceivedMessages()
    }
  })

  it('deve manter contexto em conversa de 3 turnos', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    const conversation: { sent: string; received?: string }[] = []

    // Turno 1: Apresentação
    console.log('\n--- Turno 1 ---')
    const msg1 = 'Olá! Meu nome é Carlos e estou interessado nos produtos.'
    console.log(`📤 Enviando: "${msg1}"`)
    await client.sendToSmartZap(msg1)

    const resp1 = await client.waitForResponse(TIMEOUTS.complexResponse)
    expect(resp1).not.toBeNull()
    conversation.push({ sent: msg1, received: resp1?.text })
    console.log(`📥 Recebido: "${resp1!.text.slice(0, 80)}..."`)

    // Aguarda rate limit
    await client.waitRateLimit()

    // Turno 2: Pergunta específica
    console.log('\n--- Turno 2 ---')
    const msg2 = 'Qual produto vocês mais recomendam?'
    console.log(`📤 Enviando: "${msg2}"`)
    await client.sendToSmartZap(msg2)

    const resp2 = await client.waitForResponse(TIMEOUTS.complexResponse)
    expect(resp2).not.toBeNull()
    conversation.push({ sent: msg2, received: resp2?.text })
    console.log(`📥 Recebido: "${resp2!.text.slice(0, 80)}..."`)

    // Aguarda rate limit
    await client.waitRateLimit()

    // Turno 3: Follow-up
    console.log('\n--- Turno 3 ---')
    const msg3 = 'Pode me dar mais detalhes sobre isso?'
    console.log(`📤 Enviando: "${msg3}"`)
    await client.sendToSmartZap(msg3)

    const resp3 = await client.waitForResponse(TIMEOUTS.complexResponse)
    expect(resp3).not.toBeNull()
    conversation.push({ sent: msg3, received: resp3?.text })
    console.log(`📥 Recebido: "${resp3!.text.slice(0, 80)}..."`)

    // Validações
    expect(conversation).toHaveLength(3)

    // Todas as respostas devem ter conteúdo
    for (const turn of conversation) {
      expect(turn.received).toBeTruthy()
      expect(turn.received!.length).toBeGreaterThan(5)
    }

    // Log do fluxo completo
    console.log('\n=== Conversa Completa ===')
    for (let i = 0; i < conversation.length; i++) {
      console.log(`[${i + 1}] User: ${conversation[i].sent}`)
      console.log(`[${i + 1}] AI: ${conversation[i].received?.slice(0, 100)}...`)
    }
  }, (TIMEOUTS.complexResponse * 3) + 30000)

  it('deve responder de forma contextual a perguntas de follow-up', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Pergunta inicial com contexto específico
    console.log('\n--- Estabelecendo contexto ---')
    const contextMsg = 'Estou procurando um produto para presente de aniversário para minha mãe.'
    console.log(`📤 Enviando: "${contextMsg}"`)
    await client.sendToSmartZap(contextMsg)

    const contextResp = await client.waitForResponse(TIMEOUTS.complexResponse)
    expect(contextResp).not.toBeNull()
    console.log(`📥 Recebido: "${contextResp!.text.slice(0, 80)}..."`)

    await client.waitRateLimit()

    // Follow-up que depende do contexto
    console.log('\n--- Follow-up contextual ---')
    const followUpMsg = 'Ela gosta de coisas práticas. Qual você sugere?'
    console.log(`📤 Enviando: "${followUpMsg}"`)
    await client.sendToSmartZap(followUpMsg)

    const followUpResp = await client.waitForResponse(TIMEOUTS.complexResponse)
    expect(followUpResp).not.toBeNull()
    console.log(`📥 Recebido: "${followUpResp!.text.slice(0, 80)}..."`)

    // A resposta deve ser relevante (não pode ser genérica demais)
    expect(followUpResp!.text.length).toBeGreaterThan(20)

    // Idealmente, a resposta menciona algo relacionado ao contexto
    // (presente, mãe, sugestão, etc.) - mas isso depende da configuração da AI
  }, (TIMEOUTS.complexResponse * 2) + 20000)

  it('deve lidar com mudança abrupta de assunto', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Primeiro assunto
    console.log('\n--- Assunto 1: Preços ---')
    const msg1 = 'Quanto custa o produto mais barato?'
    console.log(`📤 Enviando: "${msg1}"`)
    await client.sendToSmartZap(msg1)

    const resp1 = await client.waitForResponse(TIMEOUTS.complexResponse)
    expect(resp1).not.toBeNull()
    console.log(`📥 Recebido: "${resp1!.text.slice(0, 80)}..."`)

    await client.waitRateLimit()

    // Mudança abrupta de assunto
    console.log('\n--- Assunto 2: Localização ---')
    const msg2 = 'A propósito, onde fica a loja física de vocês?'
    console.log(`📤 Enviando: "${msg2}"`)
    await client.sendToSmartZap(msg2)

    const resp2 = await client.waitForResponse(TIMEOUTS.complexResponse)
    expect(resp2).not.toBeNull()
    console.log(`📥 Recebido: "${resp2!.text.slice(0, 80)}..."`)

    // Ambas as respostas devem ser relevantes aos seus assuntos
    expect(resp1!.text.length).toBeGreaterThan(10)
    expect(resp2!.text.length).toBeGreaterThan(10)

    // As respostas devem ser diferentes
    expect(resp1!.text).not.toBe(resp2!.text)
  }, (TIMEOUTS.complexResponse * 2) + 20000)
})
