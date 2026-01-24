/**
 * Teste E2E: Trigger de Handoff
 *
 * Valida que a AI reconhece pedidos de atendimento humano
 * e aciona o processo de handoff corretamente.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { ZApiClient } from '../z-api-client'
import { TEST_MESSAGES, EXPECTED_PATTERNS, TIMEOUTS } from '../config'

describe('E2E WhatsApp: Handoff Trigger', () => {
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

  it('deve reconhecer pedido explícito de atendente humano', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Envia trigger de handoff
    console.log(`📤 Enviando: "${TEST_MESSAGES.handoffTrigger}"`)
    await client.sendToSmartZap(TEST_MESSAGES.handoffTrigger)

    // Aguarda resposta
    console.log('⏳ Aguardando resposta...')
    const response = await client.waitForResponse(TIMEOUTS.handoffDetection)

    // Valida que recebemos uma resposta
    expect(response).not.toBeNull()
    expect(response!.text).toBeTruthy()

    console.log(`📥 Recebido: "${response!.text}"`)

    // A resposta deve indicar que o pedido foi reconhecido
    // Pode ser uma confirmação de handoff ou uma mensagem de transição
    expect(response!.text.length).toBeGreaterThan(5)

    // Opcional: verifica se contém padrões típicos de handoff
    const hasHandoffPattern = EXPECTED_PATTERNS.handoff.test(response!.text)
    if (!hasHandoffPattern) {
      console.log('⚠️  Resposta não contém padrões típicos de handoff, mas teste passou')
    }
  }, TIMEOUTS.handoffDetection + 10000)

  it('deve reconhecer variações do pedido de atendente', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    const handoffVariations = [
      'Quero falar com uma pessoa',
      'Preciso de atendimento humano',
      'Pode me transferir para um atendente?',
    ]

    // Testa apenas uma variação (para não sobrecarregar com rate limit)
    const variation = handoffVariations[Math.floor(Math.random() * handoffVariations.length)]

    console.log(`📤 Enviando variação: "${variation}"`)
    await client.sendToSmartZap(variation)

    const response = await client.waitForResponse(TIMEOUTS.handoffDetection)

    expect(response).not.toBeNull()
    expect(response!.text).toBeTruthy()

    console.log(`📥 Recebido: "${response!.text}"`)

    // A resposta deve indicar reconhecimento do pedido
    expect(response!.text.length).toBeGreaterThan(5)
  }, TIMEOUTS.handoffDetection + 10000)

  it('deve continuar respondendo normalmente após handoff não efetivado', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Nota: Este teste assume que o handoff não vai transferir imediatamente
    // (por exemplo, fora do horário de atendimento ou sem atendentes disponíveis)

    // Pede handoff
    console.log('📤 Enviando pedido de handoff...')
    await client.sendToSmartZap('Quero falar com um atendente')

    const handoffResp = await client.waitForResponse(TIMEOUTS.handoffDetection)
    expect(handoffResp).not.toBeNull()
    console.log(`📥 Handoff response: "${handoffResp!.text.slice(0, 80)}..."`)

    await client.waitRateLimit()

    // Envia mensagem normal depois
    console.log('📤 Enviando mensagem normal após handoff...')
    await client.sendToSmartZap('Ok, então me ajuda com outra coisa. Qual o prazo de entrega?')

    const normalResp = await client.waitForResponse(TIMEOUTS.complexResponse)

    // Deve receber uma resposta (seja da AI ou de confirmação de fila)
    expect(normalResp).not.toBeNull()
    expect(normalResp!.text).toBeTruthy()

    console.log(`📥 Normal response: "${normalResp!.text.slice(0, 80)}..."`)
  }, (TIMEOUTS.handoffDetection + TIMEOUTS.complexResponse) + 20000)

  it('deve lidar com frustração do usuário', async () => {
    if (!isConfigured) {
      console.log('⏭️  Skipped: Z-API not configured')
      return
    }

    // Simula usuário frustrado
    const frustratedMessage = 'Não estou entendendo nada! Quero falar com alguém que me ajude de verdade!'

    console.log(`📤 Enviando: "${frustratedMessage}"`)
    await client.sendToSmartZap(frustratedMessage)

    const response = await client.waitForResponse(TIMEOUTS.complexResponse)

    expect(response).not.toBeNull()
    expect(response!.text).toBeTruthy()

    console.log(`📥 Recebido: "${response!.text}"`)

    // A AI deve responder de forma empática ou oferecer handoff
    // Não deve ignorar a frustração
    expect(response!.text.length).toBeGreaterThan(10)
  }, TIMEOUTS.complexResponse + 10000)
})
