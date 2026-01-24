/**
 * Cliente Z-API para Testes E2E
 *
 * Wrapper tipado para enviar mensagens e receber respostas via Z-API.
 */

import { loadConfig, type ZApiConfig } from './config'

export interface ZApiMessage {
  /** ID único da mensagem */
  messageId: string

  /** Número do remetente */
  phone: string

  /** Conteúdo da mensagem */
  text: string

  /** Timestamp */
  timestamp: number

  /** Se é mensagem enviada por nós */
  fromMe: boolean
}

export interface SendMessageResponse {
  zapiMessageId: string
  messageId: string
  id: string
}

export class ZApiClient {
  private config: ZApiConfig
  private receivedMessages: ZApiMessage[] = []
  private lastMessageTimestamp: number = 0

  constructor(config?: ZApiConfig) {
    this.config = config || loadConfig()
  }

  /**
   * URL base para requisições
   */
  private get apiUrl(): string {
    return `${this.config.baseUrl}/instances/${this.config.instanceId}/token/${this.config.token}`
  }

  /**
   * Envia mensagem de texto
   */
  async sendText(phone: string, message: string): Promise<SendMessageResponse> {
    const url = `${this.apiUrl}/send-text`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Z-API send failed: ${response.status} - ${error}`)
    }

    const result = await response.json()
    this.lastMessageTimestamp = Date.now()

    return result
  }

  /**
   * Envia mensagem para o SmartZap
   */
  async sendToSmartZap(message: string): Promise<SendMessageResponse> {
    return this.sendText(this.config.smartzapPhone, message)
  }

  /**
   * Busca mensagens recebidas (chats)
   */
  async getChats(): Promise<unknown[]> {
    const url = `${this.apiUrl}/chats`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Z-API get chats failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Busca mensagens de um chat específico
   */
  async getChatMessages(phone: string, amount: number = 10): Promise<ZApiMessage[]> {
    const url = `${this.apiUrl}/chat-messages/${phone}?amount=${amount}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Z-API get messages failed: ${response.status}`)
    }

    const messages = await response.json()

    // Normaliza formato da resposta
    return messages.map((msg: {
      messageId?: string
      id?: { _serialized?: string }
      phone?: string
      from?: string
      body?: string
      text?: string
      timestamp?: number
      t?: number
      fromMe?: boolean
    }) => ({
      messageId: msg.messageId || msg.id?._serialized || '',
      phone: msg.phone || msg.from || '',
      text: msg.body || msg.text || '',
      timestamp: msg.timestamp || msg.t || 0,
      fromMe: msg.fromMe || false,
    }))
  }

  /**
   * Aguarda resposta do SmartZap
   *
   * Faz polling até receber uma mensagem do SmartZap posterior ao lastMessageTimestamp
   */
  async waitForResponse(timeout: number = this.config.responseTimeout): Promise<ZApiMessage | null> {
    const startTime = Date.now()
    const sinceTimestamp = this.lastMessageTimestamp

    while (Date.now() - startTime < timeout) {
      try {
        const messages = await this.getChatMessages(this.config.smartzapPhone, 5)

        // Procura mensagem do SmartZap (fromMe = false do ponto de vista do Z-API,
        // mas na verdade é a mensagem recebida no Z-API, enviada pelo SmartZap)
        const newMessages = messages.filter(
          msg => !msg.fromMe && msg.timestamp * 1000 > sinceTimestamp
        )

        if (newMessages.length > 0) {
          // Retorna a mensagem mais recente
          const latestMessage = newMessages.sort((a, b) => b.timestamp - a.timestamp)[0]
          this.receivedMessages.push(latestMessage)
          return latestMessage
        }
      } catch (error) {
        console.warn('Polling error:', error)
      }

      // Aguarda antes do próximo poll
      await this.delay(this.config.pollingInterval)
    }

    return null
  }

  /**
   * Verifica status da instância Z-API
   */
  async checkStatus(): Promise<{ connected: boolean; phone?: string }> {
    const url = `${this.apiUrl}/status`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return { connected: false }
    }

    const status = await response.json()
    return {
      connected: status.connected || status.status === 'connected',
      phone: status.phone || status.phoneNumber,
    }
  }

  /**
   * Aguarda delay (rate limit)
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Aguarda rate limit entre mensagens
   */
  async waitRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastMessageTimestamp
    const remaining = this.config.messageDelay - elapsed

    if (remaining > 0) {
      await this.delay(remaining)
    }
  }

  /**
   * Limpa histórico de mensagens recebidas
   */
  clearReceivedMessages(): void {
    this.receivedMessages = []
  }

  /**
   * Retorna mensagens recebidas durante o teste
   */
  getReceivedMessages(): ZApiMessage[] {
    return [...this.receivedMessages]
  }

  /**
   * Getter para config (útil para testes)
   */
  getConfig(): ZApiConfig {
    return { ...this.config }
  }
}
