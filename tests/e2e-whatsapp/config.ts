/**
 * Configuração dos Testes E2E WhatsApp (Z-API)
 *
 * Define credenciais, timeouts e parâmetros para testes funcionais.
 */

export interface ZApiConfig {
  /** ID da instância Z-API */
  instanceId: string

  /** Token de autenticação */
  token: string

  /** URL base da API */
  baseUrl: string

  /** Número do SmartZap que receberá as mensagens */
  smartzapPhone: string

  /** Número de origem (Z-API) */
  senderPhone: string

  /** Timeout para aguardar resposta (ms) */
  responseTimeout: number

  /** Intervalo de polling (ms) */
  pollingInterval: number

  /** Delay entre mensagens para evitar rate limit (ms) */
  messageDelay: number
}

/**
 * Carrega configuração do ambiente
 */
export function loadConfig(): ZApiConfig {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const smartzapPhone = process.env.SMARTZAP_PHONE_NUMBER
  const senderPhone = process.env.ZAPI_SENDER_PHONE

  if (!instanceId || !token || !smartzapPhone) {
    throw new Error(`
Missing required environment variables for E2E WhatsApp tests:
  - ZAPI_INSTANCE_ID: ${instanceId ? '✓' : '✗ (missing)'}
  - ZAPI_TOKEN: ${token ? '✓' : '✗ (missing)'}
  - SMARTZAP_PHONE_NUMBER: ${smartzapPhone ? '✓' : '✗ (missing)'}
  - ZAPI_SENDER_PHONE: ${senderPhone ? '✓ (optional)' : '- (will be auto-detected)'}

Please set these in your .env.test.local file:

  ZAPI_INSTANCE_ID=your_instance_id
  ZAPI_TOKEN=your_token
  SMARTZAP_PHONE_NUMBER=+5511999999999
  ZAPI_SENDER_PHONE=+5511888888888
`)
  }

  return {
    instanceId,
    token,
    baseUrl: 'https://api.z-api.io',
    smartzapPhone: normalizePhone(smartzapPhone),
    senderPhone: senderPhone ? normalizePhone(senderPhone) : '',
    responseTimeout: parseInt(process.env.ZAPI_RESPONSE_TIMEOUT || '60000', 10),
    pollingInterval: parseInt(process.env.ZAPI_POLLING_INTERVAL || '2000', 10),
    messageDelay: 6000, // Rate limit: 1 msg/6s para mesmo número
  }
}

/**
 * Normaliza número de telefone para formato E.164
 */
export function normalizePhone(phone: string): string {
  // Remove tudo exceto dígitos
  const digits = phone.replace(/\D/g, '')

  // Adiciona código do país se necessário
  if (digits.startsWith('55')) {
    return digits
  }

  return `55${digits}`
}

/**
 * Timeouts para diferentes cenários
 */
export const TIMEOUTS = {
  /** Tempo para AI responder uma saudação simples */
  simpleResponse: 30000,

  /** Tempo para AI responder uma pergunta complexa */
  complexResponse: 60000,

  /** Tempo para detectar handoff */
  handoffDetection: 15000,

  /** Tempo entre mensagens da mesma conversa */
  conversationGap: 6000,
}

/**
 * Mensagens de teste padronizadas
 */
export const TEST_MESSAGES = {
  /** Saudação simples */
  greeting: 'Olá! Estou testando.',

  /** Pergunta sobre horário */
  businessHours: 'Qual o horário de funcionamento?',

  /** Intenção de compra */
  purchase: 'Quero fazer um pedido',

  /** Trigger de handoff */
  handoffTrigger: 'Quero falar com um atendente humano',

  /** Mensagem de contexto (multi-turn) */
  followUp: 'Pode me dar mais detalhes?',
}

/**
 * Padrões de resposta esperados
 */
export const EXPECTED_PATTERNS = {
  /** AI deve responder com saudação */
  greeting: /ol[áa]|oi|bem.vindo|como posso (te )?ajudar/i,

  /** Resposta deve conter informação de horário */
  businessHours: /hor[áa]rio|funciona|aberto|fechado|atendimento/i,

  /** Resposta sobre pedido */
  purchase: /pedido|compra|produto|pre[çc]o|card[áa]pio/i,

  /** Confirmação de handoff */
  handoff: /atendente|humano|aguarde|transferindo|equipe/i,

  /** Qualquer resposta não-vazia */
  anyResponse: /.{10,}/,
}
