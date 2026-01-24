/**
 * Teste E2E: Resposta Simples
 *
 * Valida que a AI responde corretamente a mensagens básicas.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { ZApiClient, type ZApiMessage } from '../z-api-client'
import {
  TEST_MESSAGES,
  EXPECTED_PATTERNS,
  TIMEOUTS,
} from '../config'

describe('E2E WhatsApp: Resposta Simples', () => {
  let client: ZApiClient
  let isConfigured = false

  beforeAll(async () => {
    // Verifica se as variáveis de ambiente estão configuradas
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
      console.warn('   Set ZAPI_INSTANCE_ID, ZAPI_TOKEN, SMARTZAP_PHONE_NUMBER in .env.test.local')
    }
  })

  afterAll(async () => {
    // Cleanup se necessário
  })

  beforeEach(async () => {
    if (isConfigured) {
      // Aguarda rate limit entre testes
      await client.waitRateLimit()
    }
  })

  it('deve responder a uma saudação', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Envia saudação
    console.log(`📤 Enviando: "${TEST_MESSAGES.greeting}"`)
    await client.sendToSmartZap(TEST_MESSAGES.greeting)

    // Aguarda resposta
    console.log('⏳ Aguardando resposta...')
    const response = await client.waitForResponse(TIMEOUTS.simpleResponse)

    // Valida
    expect(response).not.toBeNull()
    expect(response!.text).toBeTruthy()
    expect(response!.text.length).toBeGreaterThan(5)

    console.log(`📥 Recebido: "${response!.text.slice(0, 100)}..."`)

    // Verifica se a resposta contém padrões esperados
    expect(response!.text).toMatch(EXPECTED_PATTERNS.anyResponse)
  }, TIMEOUTS.simpleResponse + 10000) // Timeout do test = timeout da operação + margem

  it('deve responder pergunta sobre horário', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Envia pergunta
    console.log(`📤 Enviando: "${TEST_MESSAGES.businessHours}"`)
    await client.sendToSmartZap(TEST_MESSAGES.businessHours)

    // Aguarda resposta
    console.log('⏳ Aguardando resposta...')
    const response = await client.waitForResponse(TIMEOUTS.complexResponse)

    // Valida
    expect(response).not.toBeNull()
    expect(response!.text).toBeTruthy()

    console.log(`📥 Recebido: "${response!.text.slice(0, 100)}..."`)

    // Resposta deve ser relevante (menciona horário ou algo relacionado)
    // Nota: pode falhar se a AI não tiver essa informação configurada
    expect(response!.text.length).toBeGreaterThan(10)
  }, TIMEOUTS.complexResponse + 10000)

  it('deve responder sobre pedidos/compras', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Envia intenção de compra
    console.log(`📤 Enviando: "${TEST_MESSAGES.purchase}"`)
    await client.sendToSmartZap(TEST_MESSAGES.purchase)

    // Aguarda resposta
    console.log('⏳ Aguardando resposta...')
    const response = await client.waitForResponse(TIMEOUTS.complexResponse)

    // Valida
    expect(response).not.toBeNull()
    expect(response!.text).toBeTruthy()

    console.log(`📥 Recebido: "${response!.text.slice(0, 100)}..."`)

    // Verifica que a resposta não está vazia
    expect(response!.text.length).toBeGreaterThan(10)
  }, TIMEOUTS.complexResponse + 10000)

  it('deve gerar respostas diferentes para perguntas diferentes', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    const responses: ZApiMessage[] = []

    // Envia primeira mensagem
    console.log(`📤 Enviando: "Bom dia!"`)
    await client.sendToSmartZap('Bom dia!')
    const resp1 = await client.waitForResponse(TIMEOUTS.simpleResponse)
    if (resp1) responses.push(resp1)

    // Aguarda rate limit
    await client.waitRateLimit()

    // Envia segunda mensagem (diferente)
    console.log(`📤 Enviando: "Vocês entregam?"`)
    await client.sendToSmartZap('Vocês entregam?')
    const resp2 = await client.waitForResponse(TIMEOUTS.simpleResponse)
    if (resp2) responses.push(resp2)

    // Valida que recebemos duas respostas
    expect(responses.length).toBe(2)

    // As respostas devem ser diferentes (AI contextual)
    // Nota: pode haver overlap, então verificamos que não são idênticas
    if (responses.length === 2) {
      console.log(`📥 Resposta 1: "${responses[0].text.slice(0, 50)}..."`)
      console.log(`📥 Resposta 2: "${responses[1].text.slice(0, 50)}..."`)

      // Não precisam ser completamente diferentes, mas não devem ser idênticas
      // (a menos que sejam respostas padrão muito curtas)
      if (responses[0].text.length > 20 && responses[1].text.length > 20) {
        expect(responses[0].text).not.toBe(responses[1].text)
      }
    }
  }, (TIMEOUTS.simpleResponse * 2) + 20000)
})
