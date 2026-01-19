# Implementation Plan: Inbox + AI Agents

**Feature**: 001-inbox-ai-agents
**Created**: 2026-01-19
**Status**: Planning

## Technical Context

### Stack Alignment
- **Language**: TypeScript 5.x ✅
- **Framework**: Next.js 16 (App Router) ✅
- **Database**: Supabase (PostgreSQL) ✅
- **AI SDK**: Vercel AI SDK v6 with Gemini ✅
- **Realtime**: Supabase Realtime (CentralizedRealtimeProvider) ✅
- **State**: TanStack Query v5 ✅

### Key Dependencies
- `ai@^6.0.41` - ToolLoopAgent, Structured Output
- `@ai-sdk/google@^3.0.10` - Gemini 2.5 Flash, File Search
- `@supabase/supabase-js@^2.86.2` - Database + Realtime

## Tech Stack Compliance Report

### ✅ Approved Technologies
- Vercel AI SDK v6 (already in stack)
- Supabase (already in stack)
- TanStack Query (already in stack)
- Zod (already in stack)
- React Hook Form (already in stack)
- Radix UI (already in stack)

### ➕ New Technologies
- **Google File Search** (`google.tools.fileSearch`)
  - Purpose: RAG for AI Agent knowledge base
  - No conflicts detected
  - Native to @ai-sdk/google, no new dependency

### ⚠️ Conflicting Technologies
None detected.

### ❌ Prohibited Technologies
None used in this plan.

---

## Phase 1: Database Schema

### Migration: `0001_add_inbox_and_ai_agents.sql`

**Tables to create:**

1. **inbox_conversations**
   - Core conversation state
   - Mode (bot/human), status (open/closed)
   - Counters for messages

2. **inbox_messages**
   - Individual messages (inbound/outbound)
   - AI analysis metadata
   - Delivery status tracking

3. **ai_agents**
   - Agent configuration
   - System prompt, model settings
   - File Search store reference

4. **ai_agent_logs**
   - Interaction logs for debugging
   - Input/output, sources, latency

5. **inbox_labels**
   - Organization labels for conversations

6. **inbox_quick_replies**
   - Pre-defined quick responses

7. **inbox_conversation_labels**
   - Junction table for labels

**Indexes:**
- `idx_inbox_conversations_phone` - Lookup by phone
- `idx_inbox_conversations_mode_status` - Filter by mode/status
- `idx_inbox_messages_conversation_id` - Messages by conversation
- `idx_inbox_messages_created_at` - Time-based queries

**RLS Policies:**
- All tables: Authenticated users only (single-tenant)

---

## Phase 2: Backend - Message Persistence

### Files to Create/Modify

1. **`lib/inbox/inbox-db.ts`**
   - CRUD operations for conversations
   - Message persistence
   - Counter updates

2. **`app/api/webhook/whatsapp/route.ts`** (modify)
   - Persist inbound messages
   - Create/update conversations
   - Trigger AI processing

3. **`app/api/inbox/conversations/route.ts`**
   - GET: List conversations with filters
   - PATCH: Update conversation (mode, status, labels)

4. **`app/api/inbox/conversations/[id]/messages/route.ts`**
   - GET: Messages for conversation
   - POST: Send outbound message

### Message Flow
```
Webhook → Persist Message → Update Conversation → Trigger AI (if mode=bot)
```

---

## Phase 3: AI Agent Engine

### Core Files

1. **`lib/ai/agents/support-agent.ts`**
   - ToolLoopAgent implementation
   - Structured output schema
   - Tools: fileSearch, handoffToHuman

2. **`lib/ai/tools/handoff-tool.ts`**
   - Semantic handoff detection
   - Updates conversation mode to 'human'
   - Generates summary for operator

3. **`lib/ai/model.ts`**
   - Model configuration
   - Call options schema

### AI Response Schema
```typescript
const responseSchema = z.object({
  text: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
  suggestedTags: z.array(z.string()).optional(),
  sources: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).optional(),
});
```

### Handoff Tool
```typescript
const handoffToHumanTool = tool({
  description: 'Transfer conversation to human operator when detecting frustration, complex issues, or explicit requests',
  parameters: z.object({
    reason: z.string(),
    summary: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
  }),
  execute: async ({ reason, summary, priority }) => {
    // Update conversation mode
    // Set priority
    // Return handoff message
  },
});
```

### Debounce Logic
- Configurable debounce (default: 5s)
- Wait for silence before AI processes
- Group consecutive messages

### Retry & Fallback
- Retry 1x on AI failure
- If still fails: auto-handoff with error alert
- Log all failures for debugging

---

## Phase 4: Frontend - Inbox UI

### Components

1. **`components/features/inbox/InboxView.tsx`**
   - Main inbox layout
   - Conversation list + message panel

2. **`components/features/inbox/ConversationList.tsx`**
   - List with filters (status, mode, labels)
   - Unread badge indicators
   - Real-time updates

3. **`components/features/inbox/MessagePanel.tsx`**
   - Message history display
   - Input for sending messages
   - Quick replies selector

4. **`components/features/inbox/MessageBubble.tsx`**
   - Individual message display
   - Direction (inbound/outbound) styling
   - Delivery status indicator

5. **`components/features/inbox/ConversationHeader.tsx`**
   - Contact info
   - Mode toggle (bot/human)
   - Pause automation button

### Hooks

1. **`hooks/useInbox.ts`**
   - Controller hook
   - TanStack Query for data
   - Realtime subscriptions

2. **`hooks/useConversation.ts`**
   - Single conversation state
   - Message sending
   - Optimistic updates

### Pages

1. **`app/(dashboard)/inbox/page.tsx`**
   - Main inbox page
   - Wires hook to view

2. **`app/(dashboard)/inbox/[conversationId]/page.tsx`**
   - Deep link to conversation

---

## Phase 5: AI Agent Configuration UI

### Components

1. **`components/features/settings/AIAgentsPanel.tsx`**
   - List of configured agents
   - Create/edit agent modal

2. **`components/features/settings/AIAgentForm.tsx`**
   - Agent configuration form
   - System prompt editor
   - Model/temperature settings

3. **`components/features/settings/KnowledgeBasePanel.tsx`**
   - File upload for RAG
   - Indexing status display
   - File list with delete

4. **`components/features/settings/AIAgentTestChat.tsx`**
   - Live test chat interface
   - Test agent before activation

### API Routes

1. **`app/api/ai-agents/route.ts`**
   - CRUD for agents

2. **`app/api/ai-agents/[id]/test/route.ts`**
   - Test agent with sample message

3. **`app/api/ai-agents/knowledge/route.ts`**
   - File upload to Google File Search
   - Status check

---

## Phase 6: Integration & Polish

### Tasks

1. **Webhook Integration**
   - Ensure all inbound messages hit Inbox
   - Connect AI processing pipeline

2. **Realtime Subscriptions**
   - New messages appear instantly
   - Conversation updates propagate

3. **Settings Page Updates**
   - Add AI Agents section
   - Add retention configuration

4. **Sidebar Navigation**
   - Add "Inbox" link with badge

5. **Testing**
   - Unit tests for AI tools
   - E2E tests for Inbox flows

---

## File List (New Files)

### Backend
- `lib/inbox/inbox-db.ts`
- `lib/inbox/inbox-service.ts`
- `lib/ai/agents/support-agent.ts`
- `lib/ai/tools/handoff-tool.ts`
- `lib/ai/model.ts`
- `app/api/inbox/conversations/route.ts`
- `app/api/inbox/conversations/[id]/route.ts`
- `app/api/inbox/conversations/[id]/messages/route.ts`
- `app/api/ai-agents/route.ts`
- `app/api/ai-agents/[id]/route.ts`
- `app/api/ai-agents/[id]/test/route.ts`
- `app/api/ai-agents/knowledge/route.ts`
- `supabase/migrations/0001_add_inbox_and_ai_agents.sql`

### Frontend
- `app/(dashboard)/inbox/page.tsx`
- `app/(dashboard)/inbox/[conversationId]/page.tsx`
- `components/features/inbox/InboxView.tsx`
- `components/features/inbox/ConversationList.tsx`
- `components/features/inbox/ConversationItem.tsx`
- `components/features/inbox/MessagePanel.tsx`
- `components/features/inbox/MessageBubble.tsx`
- `components/features/inbox/MessageInput.tsx`
- `components/features/inbox/ConversationHeader.tsx`
- `components/features/inbox/QuickRepliesPopover.tsx`
- `components/features/settings/AIAgentsPanel.tsx`
- `components/features/settings/AIAgentForm.tsx`
- `components/features/settings/KnowledgeBasePanel.tsx`
- `components/features/settings/AIAgentTestChat.tsx`
- `hooks/useInbox.ts`
- `hooks/useConversation.ts`
- `hooks/useAIAgents.ts`

### Types
- Update `types.ts` with all new interfaces

---

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI Framework | Vercel AI SDK v6 ToolLoopAgent | Modern abstraction, structured output, native tool support |
| RAG Provider | Google File Search | Zero-config, Gemini-native, cost-effective ($0.15/1M tokens indexing) |
| Handoff Detection | Tool-based semantic | AI decides, not keywords; more accurate |
| Realtime | Supabase Realtime | Already implemented (CentralizedRealtimeProvider) |
| State | TanStack Query | Consistent with existing codebase |
| Database | Single migration | Atomic, rollback-friendly |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| AI response latency | Set aggressive timeout, show typing indicator |
| File Search indexing delay | Show status, allow retry |
| Realtime connection drops | Auto-reconnect logic in CentralizedRealtimeProvider |
| Large message volumes | Pagination, virtual scrolling |

---

## Success Metrics

- [ ] 100% inbound messages persisted
- [ ] Inbox loads in < 2s
- [ ] AI responds in < 3s
- [ ] Handoff accuracy > 90%
- [ ] Zero message loss

---

## Next Steps

1. Run `/specswarm:tasks` to generate task breakdown
2. Implement Phase 1 (Database Schema) first
3. Backend before Frontend
