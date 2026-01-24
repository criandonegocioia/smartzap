/**
 * Receiver de Webhook da Z-API
 *
 * Servidor Express que recebe webhooks da Z-API para capturar
 * respostas do SmartZap em tempo real.
 *
 * Alternativa ao polling - mais eficiente para testes que precisam
 * de respostas em tempo real.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { EventEmitter } from 'node:events'

export interface ZApiWebhookMessage {
  /** Tipo de evento */
  type: 'ReceivedCallback' | 'MessageStatusCallback' | string

  /** ID da mensagem */
  messageId?: string

  /** Número do remetente */
  phone?: string

  /** Conteúdo da mensagem */
  text?: {
    message: string
  }

  /** Timestamp */
  momment?: number

  /** Se é do próprio número */
  isFromMe?: boolean

  /** Status da mensagem (para MessageStatusCallback) */
  status?: 'SENT' | 'DELIVERED' | 'READ'
}

export interface ReceivedMessage {
  messageId: string
  phone: string
  text: string
  timestamp: number
  isFromMe: boolean
}

export class WebhookReceiver extends EventEmitter {
  private server: ReturnType<typeof createServer> | null = null
  private messages: ReceivedMessage[] = []
  private port: number
  private isRunning = false

  constructor(port: number = 3001) {
    super()
    this.port = port
  }

  /**
   * Inicia o servidor de webhook
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleRequest(req, res)
      })

      this.server.on('error', (err: Error) => {
        if (err.message.includes('EADDRINUSE')) {
          reject(new Error(`Port ${this.port} is already in use`))
        } else {
          reject(err)
        }
      })

      this.server.listen(this.port, () => {
        this.isRunning = true
        console.log(`[WebhookReceiver] Listening on port ${this.port}`)
        resolve()
      })
    })
  }

  /**
   * Para o servidor
   */
  async stop(): Promise<void> {
    if (!this.server || !this.isRunning) {
      return
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false
        console.log('[WebhookReceiver] Stopped')
        resolve()
      })
    })
  }

  /**
   * Processa requisição HTTP
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Apenas aceita POST
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    let body = ''

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const payload = JSON.parse(body) as ZApiWebhookMessage

        this.processWebhook(payload)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('[WebhookReceiver] Parse error:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  }

  /**
   * Processa payload do webhook
   */
  private processWebhook(payload: ZApiWebhookMessage): void {
    // Apenas processa mensagens recebidas
    if (payload.type !== 'ReceivedCallback') {
      this.emit('status', payload)
      return
    }

    // Ignora mensagens enviadas por nós
    if (payload.isFromMe) {
      return
    }

    const message: ReceivedMessage = {
      messageId: payload.messageId || '',
      phone: payload.phone || '',
      text: payload.text?.message || '',
      timestamp: payload.momment || Date.now(),
      isFromMe: payload.isFromMe || false,
    }

    this.messages.push(message)
    this.emit('message', message)

    console.log(`[WebhookReceiver] Message from ${message.phone}: "${message.text.slice(0, 50)}..."`)
  }

  /**
   * Aguarda mensagem de um número específico
   */
  waitForMessage(phone: string, timeout: number = 60000): Promise<ReceivedMessage | null> {
    return new Promise((resolve) => {
      const normalizedPhone = phone.replace(/\D/g, '')

      // Verifica mensagens já recebidas
      const existing = this.messages.find(
        m => m.phone.includes(normalizedPhone) && !m.isFromMe
      )
      if (existing) {
        resolve(existing)
        return
      }

      // Configura listener para novas mensagens
      const timeoutId = setTimeout(() => {
        this.off('message', messageHandler)
        resolve(null)
      }, timeout)

      const messageHandler = (message: ReceivedMessage) => {
        if (message.phone.includes(normalizedPhone) && !message.isFromMe) {
          clearTimeout(timeoutId)
          this.off('message', messageHandler)
          resolve(message)
        }
      }

      this.on('message', messageHandler)
    })
  }

  /**
   * Aguarda qualquer mensagem
   */
  waitForAnyMessage(timeout: number = 60000): Promise<ReceivedMessage | null> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.off('message', messageHandler)
        resolve(null)
      }, timeout)

      const messageHandler = (message: ReceivedMessage) => {
        if (!message.isFromMe) {
          clearTimeout(timeoutId)
          this.off('message', messageHandler)
          resolve(message)
        }
      }

      this.on('message', messageHandler)
    })
  }

  /**
   * Retorna todas as mensagens recebidas
   */
  getMessages(): ReceivedMessage[] {
    return [...this.messages]
  }

  /**
   * Retorna mensagens de um número específico
   */
  getMessagesFrom(phone: string): ReceivedMessage[] {
    const normalizedPhone = phone.replace(/\D/g, '')
    return this.messages.filter(m => m.phone.includes(normalizedPhone))
  }

  /**
   * Limpa mensagens
   */
  clearMessages(): void {
    this.messages = []
  }

  /**
   * Retorna URL do webhook para configurar na Z-API
   */
  getWebhookUrl(publicUrl?: string): string {
    if (publicUrl) {
      return `${publicUrl}/webhook`
    }
    return `http://localhost:${this.port}/webhook`
  }
}

/**
 * Cria e inicia um receiver (helper para testes)
 */
export async function createReceiver(port?: number): Promise<WebhookReceiver> {
  const receiver = new WebhookReceiver(port)
  await receiver.start()
  return receiver
}
