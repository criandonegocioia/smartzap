/**
 * Gerador de Payloads de Webhook
 *
 * Simula mensagens recebidas do WhatsApp Cloud API.
 * Gera payloads realistas para stress test.
 */

import { nanoid } from 'nanoid'

/**
 * Pool de mensagens variadas para simular interações reais
 */
export const MESSAGE_POOL = [
  // Saudações
  'Olá!',
  'Oi, tudo bem?',
  'Bom dia!',
  'Boa tarde!',
  'Boa noite!',

  // Perguntas comuns
  'Qual o horário de funcionamento?',
  'Vocês entregam?',
  'Quais formas de pagamento?',
  'Tem estacionamento?',
  'Onde fica a loja?',

  // Intenções de compra
  'Quero fazer um pedido',
  'Quanto custa?',
  'Tem disponível?',
  'Qual o prazo de entrega?',
  'Aceita cartão?',

  // Suporte
  'Preciso de ajuda',
  'Tenho uma dúvida',
  'Meu pedido atrasou',
  'Quero trocar um produto',
  'Não recebi meu pedido',

  // Handoff triggers
  'Quero falar com atendente',
  'Preciso falar com uma pessoa',
  'Atendimento humano',

  // Respostas curtas
  'Sim',
  'Não',
  'Ok',
  'Certo',
  'Entendi',

  // Mensagens mais longas
  'Gostaria de saber mais informações sobre os produtos disponíveis para pronta entrega',
  'Estou interessado em fazer uma compra mas tenho algumas dúvidas sobre garantia',
  'Vi a promoção no Instagram e quero aproveitar, como faço para comprar?',
]

/**
 * Tipos de mensagem suportados
 */
export type MessageType = 'text' | 'image' | 'document' | 'button' | 'interactive'

interface WebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          phone_number_id: string
          display_phone_number: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: MessageType
          text?: { body: string }
          button?: { text: string; payload: string }
          interactive?: {
            type: string
            button_reply?: { id: string; title: string }
            list_reply?: { id: string; title: string; description?: string }
          }
        }>
      }
      field: string
    }>
  }>
}

interface PayloadOptions {
  phone: string
  message?: string
  type?: MessageType
  wabaId?: string
  phoneNumberId?: string
  displayPhoneNumber?: string
  contactName?: string
}

/**
 * Gera ID de mensagem no formato WhatsApp
 */
function generateMessageId(): string {
  return `wamid.HBgNNTUxMTk${nanoid(20)}=`
}

/**
 * Gera número de telefone único baseado no índice
 */
export function generateUniquePhone(index: number): string {
  const suffix = String(index).padStart(6, '0')
  return `5511900${suffix}`
}

/**
 * Seleciona mensagem aleatória do pool
 */
export function getRandomMessage(): string {
  return MESSAGE_POOL[Math.floor(Math.random() * MESSAGE_POOL.length)]
}

/**
 * Gera nome de contato aleatório
 */
function generateContactName(): string {
  const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Fernanda', 'Lucas', 'Juliana', 'Rafael', 'Camila']
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento']

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

  return `${firstName} ${lastName}`
}

/**
 * Gera payload de webhook realista
 */
export function generateWebhookPayload(options: PayloadOptions): WebhookPayload {
  const {
    phone,
    message = getRandomMessage(),
    type = 'text',
    wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'TEST_WABA_ID',
    phoneNumberId = process.env.WHATSAPP_PHONE_ID || 'TEST_PHONE_ID',
    displayPhoneNumber = '+5511999999999',
    contactName = generateContactName(),
  } = options

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const messageId = generateMessageId()

  // Base do payload
  const payload: WebhookPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: wabaId,
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            phone_number_id: phoneNumberId,
            display_phone_number: displayPhoneNumber,
          },
          contacts: [{
            profile: { name: contactName },
            wa_id: phone,
          }],
          messages: [{
            from: phone,
            id: messageId,
            timestamp,
            type,
          }],
        },
        field: 'messages',
      }],
    }],
  }

  // Adiciona conteúdo baseado no tipo
  const messageObj = payload.entry[0].changes[0].value.messages![0]

  switch (type) {
    case 'text':
      messageObj.text = { body: message }
      break
    case 'button':
      messageObj.button = { text: message, payload: `PAYLOAD_${message.toUpperCase().replace(/\s/g, '_')}` }
      break
    case 'interactive':
      messageObj.interactive = {
        type: 'button_reply',
        button_reply: { id: 'btn_1', title: message },
      }
      break
    default:
      messageObj.text = { body: message }
  }

  return payload
}

/**
 * Gera batch de payloads únicos
 */
export function generatePayloadBatch(count: number, startIndex: number = 0): WebhookPayload[] {
  const payloads: WebhookPayload[] = []

  for (let i = 0; i < count; i++) {
    const phone = generateUniquePhone(startIndex + i)
    payloads.push(generateWebhookPayload({ phone }))
  }

  return payloads
}

/**
 * Gera payload de status update (opcional, para simular eventos de entrega)
 */
export function generateStatusPayload(phone: string, messageId: string, status: 'sent' | 'delivered' | 'read'): WebhookPayload {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'TEST_WABA_ID'
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID || 'TEST_PHONE_ID'
  const timestamp = Math.floor(Date.now() / 1000).toString()

  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: wabaId,
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            phone_number_id: phoneNumberId,
            display_phone_number: '+5511999999999',
          },
          // @ts-expect-error - statuses não está no tipo messages
          statuses: [{
            id: messageId,
            status,
            timestamp,
            recipient_id: phone,
          }],
        },
        field: 'messages',
      }],
    }],
  }
}
