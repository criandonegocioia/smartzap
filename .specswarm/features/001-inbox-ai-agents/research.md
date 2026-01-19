# Research: Inbox + AI Agents

**Feature**: 001-inbox-ai-agents
**Created**: 2026-01-19

## Resolved Clarifications

### 1. AI Failure Handling

**Question**: Quando o AI Agent falhar (timeout, erro de API), o que acontece?

**Decision**: Retry 1x, se falhar faz handoff automático para humano com alerta explicando o erro.

**Rationale**:
- Single retry captura falhas transientes (rede, rate limit temporário)
- Handoff imediato após segunda falha garante que o lead não fica sem resposta
- Alerta visível ajuda operador a entender contexto
- Log detalhado para debugging posterior

**Implementation**:
```typescript
try {
  const response = await supportAgent.run({ message });
  return response;
} catch (firstError) {
  console.warn('AI first attempt failed:', firstError);
  try {
    const response = await supportAgent.run({ message });
    return response;
  } catch (secondError) {
    console.error('AI retry failed:', secondError);
    await triggerHandoff({
      reason: 'AI_ERROR',
      summary: `AI falhou após retry: ${secondError.message}`,
      priority: 'high',
    });
    throw secondError;
  }
}
```

### 2. Data Retention

**Question**: Por quanto tempo mensagens/conversas são retidas?

**Decision**: Período configurável pelo admin nas configurações.

**Rationale**:
- Diferentes empresas têm diferentes requisitos de compliance
- LGPD pode exigir retenção mínima ou máxima
- Flexibilidade > valor padrão fixo

**Implementation**:
- Novo campo em `settings`: `inbox_retention_days` (default: 365)
- Job de limpeza diário (ou QStash scheduled)
- Soft delete primeiro (flag `archived_at`), hard delete após grace period

### 3. Message Debounce

**Question**: Se lead enviar várias mensagens rápidas, AI responde cada uma?

**Decision**: Debounce configurável (padrão: 5 segundos de silêncio antes de responder).

**Rationale**:
- Leads frequentemente enviam mensagens fragmentadas
- Responder cada uma seria spam e custoso
- 5s é tempo suficiente para pessoa terminar de digitar
- Configurável para casos especiais (suporte urgente = 2s)

**Implementation**:
```typescript
// Pseudo-code do debounce
const lastMessageTime = await getLastMessageTime(conversationId);
const debounceMs = settings.inbox_debounce_ms || 5000;

if (Date.now() - lastMessageTime < debounceMs) {
  // Schedule delayed processing
  await scheduleAIProcessing(conversationId, debounceMs);
} else {
  // Process immediately
  await processWithAI(conversationId);
}
```

---

## Technical Research

### 1. Vercel AI SDK v6 - ToolLoopAgent

**Question**: Como implementar agente com loop de tools e structured output?

**Findings**:
- `ToolLoopAgent` é a abstração recomendada para agentes reutilizáveis
- Suporta `stopWhen` para limitar iterações (evitar loop infinito)
- `prepareCall` permite injetar contexto dinâmico por request
- Combina tools + structured output nativamente

**Decision**: Usar ToolLoopAgent como base do AI Agent

**Code Pattern**:
```typescript
import { ToolLoopAgent, Output, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';

export const supportAgent = new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  callOptionsSchema: z.object({
    conversationId: z.string(),
    contactName: z.string(),
    previousMessages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `
Você é um assistente de atendimento da empresa.
Cliente: ${options.contactName}

Histórico recente:
${options.previousMessages.map(m => `${m.role}: ${m.content}`).join('\n')}
    `,
  }),
  tools: {
    fileSearch: google.tools.fileSearch({
      fileSearchStoreNames: ['fileSearchStores/YOUR_STORE_ID'],
      topK: 5,
    }),
    handoffToHuman: handoffToHumanTool,
  },
  output: Output.object({ schema: responseSchema }),
  stopWhen: stepCountIs(5),
});
```

### 2. Google File Search (RAG)

**Question**: Como funciona o File Search do Google para RAG?

**Findings**:
- Google gerencia todo o pipeline de RAG
- Upload via API → Indexação automática → Query via tool
- Custo: $0.15/1M tokens para indexação, query é grátis
- Suporta: PDF, TXT, JSON, MD, DOCX, HTML
- Retrieval configurável via `topK`

**Decision**: Usar Google File Search nativo (zero config)

**Implementation**:
1. Upload de arquivo via Google AI API
2. Associar ao File Search Store
3. Referenciar store no `fileSearch` tool
4. Google faz retrieval automaticamente

### 3. Handoff Semântico vs Keywords

**Question**: Handoff por keywords é suficiente?

**Findings**:
- Keywords falham em contexto ("não estou frustrado" seria match falso)
- Variações linguísticas são infinitas
- AI já entende contexto, só precisa de "permissão" para agir

**Decision**: Tool-based handoff onde AI decide chamar a tool

**Rationale**:
- AI avalia contexto completo da conversa
- Descrição da tool guia a decisão
- Mais preciso que regex/keywords
- Permite justificativa (reason) e summary

### 4. Realtime Strategy

**Question**: Como garantir atualizações em tempo real no Inbox?

**Findings**:
- Projeto já tem `CentralizedRealtimeProvider`
- Supabase Realtime suporta `postgres_changes`
- Pode filtrar por tabela e operação

**Decision**: Reutilizar CentralizedRealtimeProvider

**Implementation**:
```typescript
// No hook useInbox
useEffect(() => {
  const channel = supabase.channel('inbox-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'inbox_messages' },
      (payload) => {
        queryClient.invalidateQueries(['inbox', 'messages']);
      }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}, []);
```

---

## Alternatives Considered

### AI Framework

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Vercel AI SDK v6 | Native tools, structured output, ToolLoopAgent | Newer, less examples | ✅ Chosen |
| LangChain | Mature, many examples | Heavy, complex abstractions | ❌ Rejected |
| Direct Gemini API | Full control | Manual everything | ❌ Rejected |

### RAG Provider

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Google File Search | Zero config, Gemini-native | Vendor lock-in | ✅ Chosen |
| Pinecone + OpenAI | Popular, flexible | Extra infra, cost | ❌ Rejected |
| Supabase pgvector | Self-hosted, control | Manual chunking/embedding | ❌ Rejected |

### Handoff Detection

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Tool-based | Semantic, accurate | Requires good prompt | ✅ Chosen |
| Keyword list | Simple | False positives/negatives | ❌ Rejected |
| Sentiment classifier | Dedicated model | Extra latency, cost | ❌ Rejected |

---

## Open Questions

None - all clarifications resolved.
