# Tasks: Inbox + AI Agents

**Feature**: 001-inbox-ai-agents
**Generated**: 2026-01-19
**Total Tasks**: 52
**Estimated Phases**: 8

<!-- Tech Stack Validation: PASSED -->
<!-- Validated against: .specswarm/tech-stack.md v1.0.0 -->
<!-- No prohibited technologies found -->

---

## Task Legend

- `[P]` = Parallelizable (can run concurrently with other [P] tasks in same phase)
- `[US#]` = User Story reference
- `[FR#]` = Functional Requirement reference
- `→` = Depends on previous task
- `⚡` = Critical path (blocks multiple downstream tasks)

---

## Phase 1: Setup & Types

**Goal**: Establish TypeScript types and foundational structures

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T001 | Add Inbox type definitions (ConversationStatus, ConversationMode, ConversationPriority, MessageDirection, MessageType, DeliveryStatus, Sentiment) | `types.ts` | [P] | Enums and union types |
| T002 | Add InboxConversation interface | `types.ts` | [P] | Include all fields from data-model |
| T003 | Add InboxMessage interface | `types.ts` | [P] | Include ai_sentiment, ai_sources |
| T004 | Add AIAgent interface | `types.ts` | [P] | Include debounce_ms, file_search_store_id |
| T005 | Add AIAgentLog interface | `types.ts` | [P] | Include tools_used, sources, latency_ms |
| T006 | Add InboxLabel interface | `types.ts` | [P] | Simple entity |
| T007 | Add InboxQuickReply interface | `types.ts` | [P] | Include shortcut field |

**✅ Checkpoint**: All types compile without errors

---

## Phase 2: Foundation (Database)

**Goal**: Create database schema - BLOCKS all other phases

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T008 | ⚡ Create migration file with all tables (inbox_conversations, inbox_messages, ai_agents, ai_agent_logs, inbox_labels, inbox_conversation_labels, inbox_quick_replies) | `supabase/migrations/0001_add_inbox_and_ai_agents.sql` | [FR1] | Single atomic migration |
| T009 | → Add indexes (phone, mode_status, conversation_id, created_at, whatsapp_id) | `supabase/migrations/0001_add_inbox_and_ai_agents.sql` | | Append to T008 |
| T010 | → Add RLS policies for all inbox tables | `supabase/migrations/0001_add_inbox_and_ai_agents.sql` | | Authenticated users only |
| T011 | → Add check constraints (status, mode, priority, direction, delivery_status enums) | `supabase/migrations/0001_add_inbox_and_ai_agents.sql` | | Data integrity |
| T012 | → Add unique constraint for ai_agents.is_default (only one true) | `supabase/migrations/0001_add_inbox_and_ai_agents.sql` | | Partial unique index |
| T013 | → Add trigger for updated_at auto-update on inbox_conversations | `supabase/migrations/0001_add_inbox_and_ai_agents.sql` | | Use existing pattern |

**✅ Checkpoint**: Migration applies successfully, tables visible in Supabase

---

## Phase 3: US1 - Operador Visualiza Conversas

**Goal**: Operador pode ver lista de conversas e histórico de mensagens em tempo real
**User Story**: Cenário 1 - Operador visualiza conversas em tempo real
**FRs**: FR2 (Interface), FR3 (Envio), FR9 (Organização)

### 3.1 Backend - Data Layer

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T014 | Create inbox-db.ts with CRUD for conversations (getAll, getById, create, update) | `lib/inbox/inbox-db.ts` | [P][FR2] | Use Supabase client |
| T015 | Add message CRUD functions (getByConversation, create, updateDeliveryStatus) | `lib/inbox/inbox-db.ts` | [P][FR3] | Pagination support |
| T016 | Add conversation counter functions (incrementUnread, markAsRead, updateLastMessage) | `lib/inbox/inbox-db.ts` | [P][FR2] | Atomic updates |
| T017 | Create inbox-service.ts with business logic layer | `lib/inbox/inbox-service.ts` | [P] | Wraps inbox-db |
| T018 | Add labels CRUD in inbox-db.ts (createLabel, deleteLabel, addLabelToConversation, removeLabelFromConversation) | `lib/inbox/inbox-db.ts` | [P][FR9] | Junction table ops |
| T019 | Add quick replies CRUD in inbox-db.ts (getAll, create, update, delete) | `lib/inbox/inbox-db.ts` | [P][FR9] | Simple CRUD |

### 3.2 Backend - API Routes

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T020 | Create GET /api/inbox/conversations (list with filters: status, mode, label, search, pagination) | `app/api/inbox/conversations/route.ts` | [P][FR2] | Use inbox-service |
| T021 | Create GET /api/inbox/conversations/[id] (conversation details with contact join) | `app/api/inbox/conversations/[id]/route.ts` | [P][FR2] | Include labels |
| T022 | Create PATCH /api/inbox/conversations/[id] (update status, mode, priority, labels) | `app/api/inbox/conversations/[id]/route.ts` | [P][FR2] | Validation with Zod |
| T023 | Create GET /api/inbox/conversations/[id]/messages (paginated, cursor-based) | `app/api/inbox/conversations/[id]/messages/route.ts` | [P][FR2] | Before cursor |
| T024 | Create POST /api/inbox/conversations/[id]/messages (send text or template) | `app/api/inbox/conversations/[id]/messages/route.ts` | [P][FR3] | Call WhatsApp API |
| T025 | Create POST /api/inbox/conversations/[id]/read (mark as read) | `app/api/inbox/conversations/[id]/read/route.ts` | [P][FR2] | Reset unread_count |
| T026 | Create GET/POST /api/inbox/labels (list and create labels) | `app/api/inbox/labels/route.ts` | [P][FR9] | Color validation |
| T027 | Create GET/POST /api/inbox/quick-replies (list and create quick replies) | `app/api/inbox/quick-replies/route.ts` | [P][FR9] | Shortcut uniqueness |

### 3.3 Frontend - Hooks

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T028 | Create useInbox hook (list conversations, filters, realtime subscription) | `hooks/useInbox.ts` | [P][FR2] | TanStack Query + Realtime |
| T029 | Create useConversation hook (single conversation, messages, send message) | `hooks/useConversation.ts` | [P][FR2][FR3] | Optimistic updates |
| T030 | Create useLabels hook (CRUD labels) | `hooks/useLabels.ts` | [P][FR9] | Simple query/mutation |
| T031 | Create useQuickReplies hook (CRUD quick replies) | `hooks/useQuickReplies.ts` | [P][FR9] | Simple query/mutation |

### 3.4 Frontend - Components

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T032 | Create InboxView (main layout: sidebar + panel split) | `components/features/inbox/InboxView.tsx` | [FR2] | ResizablePanels |
| T033 | → Create ConversationList (filterable list with unread badges) | `components/features/inbox/ConversationList.tsx` | [FR2] | Virtual scroll if >100 |
| T034 | → Create ConversationItem (preview card with avatar, name, last message, time, badges) | `components/features/inbox/ConversationItem.tsx` | [P][FR2] | Memoized |
| T035 | → Create MessagePanel (message list + input area) | `components/features/inbox/MessagePanel.tsx` | [FR2][FR3] | Stick to bottom |
| T036 | → Create MessageBubble (inbound/outbound styling, delivery status, timestamp) | `components/features/inbox/MessageBubble.tsx` | [P][FR3] | Different layouts |
| T037 | → Create MessageInput (textarea + send button + quick replies trigger) | `components/features/inbox/MessageInput.tsx` | [P][FR3] | Ctrl+Enter to send |
| T038 | → Create ConversationHeader (contact info, mode badge, actions) | `components/features/inbox/ConversationHeader.tsx` | [P][FR2] | Mode toggle button |
| T039 | → Create QuickRepliesPopover (searchable list of quick replies) | `components/features/inbox/QuickRepliesPopover.tsx` | [P][FR9] | Click to insert |
| T040 | Create Inbox page wiring hook to view | `app/(dashboard)/inbox/page.tsx` | | Thin page |
| T041 | Create Inbox/[conversationId] page for deep linking | `app/(dashboard)/inbox/[conversationId]/page.tsx` | | URL param → selection |

**✅ Checkpoint US1**: Operador consegue ver lista de conversas, selecionar uma, ver histórico e enviar mensagens

---

## Phase 4: US2 - AI Agent Responde Automaticamente

**Goal**: AI Agent processa mensagens inbound e responde automaticamente
**User Story**: Cenário 2 - AI Agent responde automaticamente
**FRs**: FR1 (Persistência), FR4 (AI Agent)

### 4.1 AI Engine

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T042 | Create model.ts with Gemini configuration and callOptionsSchema | `lib/ai/model.ts` | [P][FR4] | gemini-2.5-flash |
| T043 | Create support-agent.ts with ToolLoopAgent, responseSchema, fileSearch tool | `lib/ai/agents/support-agent.ts` | ⚡[FR4] | Core AI logic |
| T044 | → Add debounce logic in support-agent (wait for configurable silence period) | `lib/ai/agents/support-agent.ts` | [FR4] | Default 5s |
| T045 | → Add retry logic (1x retry, then auto-handoff with error alert) | `lib/ai/agents/support-agent.ts` | [FR4] | Error handling |

### 4.2 Webhook Integration

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T046 | Modify webhook to persist inbound messages to inbox_messages | `app/api/webhook/whatsapp/route.ts` | ⚡[FR1] | Create conversation if needed |
| T047 | → Add logic to trigger AI processing when conversation mode = 'bot' | `app/api/webhook/whatsapp/route.ts` | [FR4] | Respect debounce |
| T048 | → Add delivery status webhook handler (update inbox_messages.delivery_status) | `app/api/webhook/whatsapp/route.ts` | [FR3] | sent/delivered/read/failed |

### 4.3 AI Logging

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T049 | Add AI log persistence in support-agent (input, output, sources, latency, error) | `lib/ai/agents/support-agent.ts` | [FR4] | Every AI call logged |

**✅ Checkpoint US2**: Mensagem inbound é persistida, AI responde automaticamente quando mode=bot

---

## Phase 5: US3 - Handoff Inteligente

**Goal**: AI detecta necessidade de handoff e transfere para humano
**User Story**: Cenário 3 - Handoff inteligente para humano
**FRs**: FR5 (Handoff)

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T050 | Create handoff-tool.ts with semantic detection (frustration, explicit request, sensitive topics) | `lib/ai/tools/handoff-tool.ts` | ⚡[FR5] | Tool definition |
| T051 | → Implement handoff execution (update mode to 'human', set priority, generate summary) | `lib/ai/tools/handoff-tool.ts` | [FR5] | Write to handoff_summary |
| T052 | → Integrate handoff tool into support-agent tools array | `lib/ai/agents/support-agent.ts` | [FR5] | AI can call it |

**✅ Checkpoint US3**: AI detecta frustração e faz handoff automaticamente com resumo

---

## Phase 6: US4 - Configuração de AI Agent

**Goal**: Admin pode configurar AI Agents e base de conhecimento
**User Story**: Cenário 4 - Configuração de AI Agent
**FRs**: FR6 (Gestão), FR7 (Knowledge Base)

### 6.1 Backend

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T053 | Create GET/POST /api/ai-agents (list and create agents) | `app/api/ai-agents/route.ts` | [P][FR6] | Validation |
| T054 | Create GET/PATCH/DELETE /api/ai-agents/[id] (agent CRUD) | `app/api/ai-agents/[id]/route.ts` | [P][FR6] | Cannot delete default if active |
| T055 | Create POST /api/ai-agents/[id]/test (test agent with sample message) | `app/api/ai-agents/[id]/test/route.ts` | [P][FR6] | Returns AI response |
| T056 | Create POST /api/ai-agents/[id]/set-default (set as default agent) | `app/api/ai-agents/[id]/set-default/route.ts` | [P][FR6] | Unset previous default |
| T057 | Create GET/POST/DELETE /api/ai-agents/knowledge (file upload to Google File Search) | `app/api/ai-agents/knowledge/route.ts` | [P][FR7] | Handle indexing status |

### 6.2 Frontend - Hooks

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T058 | Create useAIAgents hook (list, create, update, delete, test agents) | `hooks/useAIAgents.ts` | [P][FR6] | TanStack Query |
| T059 | Create useKnowledgeBase hook (list files, upload, delete, check status) | `hooks/useKnowledgeBase.ts` | [P][FR7] | Poll for indexing |

### 6.3 Frontend - Components

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T060 | Create AIAgentsPanel (list agents with create/edit/delete/test actions) | `components/features/settings/AIAgentsPanel.tsx` | [FR6] | Table view |
| T061 | → Create AIAgentForm (name, prompt, model, temperature, debounce settings) | `components/features/settings/AIAgentForm.tsx` | [FR6] | React Hook Form |
| T062 | → Create KnowledgeBasePanel (file list, upload button, status badges) | `components/features/settings/KnowledgeBasePanel.tsx` | [FR7] | Drag & drop |
| T063 | → Create AIAgentTestChat (live chat interface to test agent before activation) | `components/features/settings/AIAgentTestChat.tsx` | [FR6] | useChat from AI SDK |

**✅ Checkpoint US4**: Admin pode criar agent, configurar prompt, upload knowledge base, testar e ativar

---

## Phase 7: US5 - Pausar Automação

**Goal**: Operador pode pausar automação temporariamente
**User Story**: Cenário 5 - Pausar automação temporariamente
**FRs**: FR8 (Controle de Automação)

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T064 | Create POST /api/inbox/conversations/[id]/pause (pause for X minutes) | `app/api/inbox/conversations/[id]/pause/route.ts` | [P][FR8] | Set automation_paused_until |
| T065 | Create POST /api/inbox/conversations/[id]/resume (resume immediately) | `app/api/inbox/conversations/[id]/resume/route.ts` | [P][FR8] | Clear pause fields |
| T066 | → Update webhook to check automation_paused_until before triggering AI | `app/api/webhook/whatsapp/route.ts` | [FR8] | Skip AI if paused |
| T067 | → Add pause/resume buttons to ConversationHeader | `components/features/inbox/ConversationHeader.tsx` | [FR8] | Time picker popover |
| T068 | → Update useConversation hook with pause/resume mutations | `hooks/useConversation.ts` | [FR8] | Optimistic update |

**✅ Checkpoint US5**: Operador pode pausar bot por X minutos e resumir manualmente

---

## Phase 8: Polish & Integration

**Goal**: Final integration, navigation, and cleanup
**FRs**: FR10 (Retenção)

| ID | Task | File | Labels | Notes |
|----|------|------|--------|-------|
| T069 | Add "Inbox" link to sidebar navigation with unread badge | `components/layout/DashboardSidebar.tsx` | [P] | MessageSquare icon |
| T070 | Add AI Agents section to Settings page | `components/features/settings/SettingsView.tsx` | [P] | New tab/section |
| T071 | Add retention configuration to Settings (inbox_retention_days) | `components/features/settings/SettingsView.tsx` | [P][FR10] | Number input |
| T072 | Configure Realtime subscription in CentralizedRealtimeProvider for inbox tables | `components/providers/CentralizedRealtimeProvider.tsx` | | inbox_messages, inbox_conversations |
| T073 | Add loading states and empty states to all Inbox components | Multiple files | [P] | Skeletons |
| T074 | Add error boundaries and error states to Inbox components | Multiple files | [P] | Toast notifications |

**✅ Final Checkpoint**: Full feature complete, navigable from sidebar, realtime working

---

## Dependency Graph

```
Phase 1 (Types)
    │
    ▼
Phase 2 (Database) ⚡ BLOCKING
    │
    ├──────────────────────────────┐
    ▼                              ▼
Phase 3 (US1: Inbox UI)    Phase 4 (US2: AI Engine)
    │                              │
    │                              ▼
    │                      Phase 5 (US3: Handoff)
    │                              │
    ├──────────────────────────────┤
    ▼                              ▼
Phase 6 (US4: AI Config)   Phase 7 (US5: Pause)
    │                              │
    └──────────────────────────────┤
                                   ▼
                           Phase 8 (Polish)
```

---

## Parallel Execution Opportunities

### Phase 1 (All parallel)
```bash
# Can run T001-T007 simultaneously (different sections of types.ts)
```

### Phase 3 (After T014-T019)
```bash
# Backend APIs (T020-T027) - all parallel
# Frontend Hooks (T028-T031) - all parallel, after APIs
# Frontend Components (T033-T041) - mostly parallel after T032
```

### Phase 4 + 5 (Can start after Phase 2)
```bash
# T042-T043 (AI engine) parallel with Phase 3
# T050-T052 (Handoff) requires T043
```

### Phase 6 + 7 (Can run in parallel)
```bash
# Phase 6 independent of Phase 7
# Both require Phase 3 (Inbox UI) for integration
```

---

## MVP Scope Recommendation

**Minimum Viable Product (US1 + US2 only):**

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T001-T007 | Types |
| 2 | T008-T013 | Database |
| 3 | T014-T041 | Inbox UI |
| 4 | T042-T049 | AI Engine |

This gives you:
- ✅ Conversations persisted
- ✅ Inbox interface working
- ✅ AI responding automatically
- ❌ No handoff (AI always responds)
- ❌ No AI configuration UI (hardcoded agent)
- ❌ No pause functionality

**Tasks for MVP**: 49 tasks
**Tasks for Full Feature**: 74 tasks

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 74 |
| User Stories | 5 |
| Phases | 8 |
| Critical Path Tasks | 5 (T008, T043, T046, T050, T072) |
| Parallel Opportunities | 60%+ of tasks |
| Estimated LOC | ~3000-4000 |
