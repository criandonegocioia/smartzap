# SmartZap E2E WhatsApp Tests (Z-API)

Testes funcionais end-to-end que validam o fluxo real de conversa no WhatsApp usando Z-API.

## Pré-requisitos

1. **Conta Z-API** com instância conectada ao WhatsApp
2. **Número do SmartZap** configurado e recebendo webhooks
3. **Variáveis de ambiente** configuradas

## Configuração

### 1. Crie o arquivo `.env.test.local`

```env
# Z-API Credentials
ZAPI_INSTANCE_ID=your_instance_id
ZAPI_TOKEN=your_token

# SmartZap (número que receberá as mensagens)
SMARTZAP_PHONE_NUMBER=+5511999999999

# Z-API Sender (número conectado à Z-API) - opcional
ZAPI_SENDER_PHONE=+5511888888888

# Timeouts (opcional)
ZAPI_RESPONSE_TIMEOUT=60000
ZAPI_POLLING_INTERVAL=2000
```

### 2. Verifique a conexão Z-API

```bash
# Deve retornar status "connected"
curl https://api.z-api.io/instances/YOUR_INSTANCE_ID/token/YOUR_TOKEN/status
```

## Uso

```bash
# Executar todos os testes E2E WhatsApp
npm run test:e2e:whatsapp

# Modo watch (re-executa ao salvar)
npm run test:e2e:whatsapp:watch

# Executar cenário específico
npx vitest run tests/e2e-whatsapp/scenarios/simple-response.test.ts
```

## Cenários de Teste

### `simple-response.test.ts`

Valida respostas básicas da AI:
- Resposta a saudações
- Resposta a perguntas sobre horário
- Resposta a intenções de compra
- Geração de respostas diferentes para perguntas diferentes

### `conversation-flow.test.ts`

Valida conversas multi-turno:
- Manutenção de contexto em 3+ turnos
- Respostas contextuais a follow-ups
- Handling de mudança abrupta de assunto

### `handoff-trigger.test.ts`

Valida detecção de handoff:
- Reconhecimento de pedido explícito de atendente
- Variações do pedido de handoff
- Comportamento após handoff
- Handling de frustração do usuário

## Arquitetura

```
tests/e2e-whatsapp/
├── config.ts           # Configuração e variáveis de ambiente
├── z-api-client.ts     # Cliente para Z-API
├── webhook-receiver.ts # Servidor para receber webhooks (opcional)
└── scenarios/
    ├── simple-response.test.ts
    ├── conversation-flow.test.ts
    └── handoff-trigger.test.ts
```

## Fluxo dos Testes

```
1. Z-API Client envia mensagem para SmartZap
        ↓
2. SmartZap recebe via webhook
        ↓
3. SmartZap processa com AI
        ↓
4. SmartZap responde via WhatsApp API
        ↓
5. Z-API recebe a resposta
        ↓
6. Teste faz polling e valida resposta
```

## Limitações

### Rate Limits

- **WhatsApp pair limit**: 1 mensagem a cada 6 segundos para o mesmo número
- Os testes aguardam automaticamente entre mensagens

### Não é Stress Test

- Estes testes validam **funcionalidade**, não **capacidade**
- Para stress test, use `tests/stress/`

### Dependência Externa

- Requer Z-API funcionando e conectada
- Testes são automaticamente skippados se Z-API não estiver configurada

## Webhook Receiver (Opcional)

Para receber respostas em tempo real (sem polling):

```typescript
import { createReceiver } from './webhook-receiver'

const receiver = await createReceiver(3001)
console.log(`Webhook URL: ${receiver.getWebhookUrl()}`)

// Configure esta URL na Z-API como webhook de mensagens recebidas

const message = await receiver.waitForMessage('+5511999999999', 60000)
console.log('Received:', message)
```

## Troubleshooting

### "Z-API not configured"

Verifique se as variáveis de ambiente estão no `.env.test.local`:

```bash
cat .env.test.local | grep ZAPI
```

### "Z-API instance not connected"

1. Acesse o painel Z-API
2. Verifique se o QR Code foi escaneado
3. Verifique se o WhatsApp está conectado

### Timeouts nos testes

Aumente os timeouts em `config.ts`:

```typescript
export const TIMEOUTS = {
  simpleResponse: 60000,  // 60s
  complexResponse: 120000, // 2min
  ...
}
```

### Rate limit errors

Os testes aguardam automaticamente 6 segundos entre mensagens. Se ainda houver erros:

1. Aumente `messageDelay` em `config.ts`
2. Execute menos testes por vez

## Exemplo de Output

```
✅ Z-API connected: +5511888888888

E2E WhatsApp: Resposta Simples
  📤 Enviando: "Olá! Estou testando."
  ⏳ Aguardando resposta...
  📥 Recebido: "Olá! Como posso ajudar você hoje?"
  ✓ deve responder a uma saudação (8234 ms)
```
