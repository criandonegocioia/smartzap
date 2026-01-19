# Data Model: Inbox + AI Agents

**Feature**: 001-inbox-ai-agents
**Created**: 2026-01-19

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│    contacts     │       │   ai_agents     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ phone           │       │ name            │
│ name            │       │ system_prompt   │
│ ...             │       │ model_config    │
└────────┬────────┘       │ file_search_id  │
         │                │ is_default      │
         │                └────────┬────────┘
         │                         │
         │    ┌────────────────────┘
         │    │
         ▼    ▼
┌─────────────────────────────────┐
│      inbox_conversations        │
├─────────────────────────────────┤
│ id (PK)                         │
│ contact_id (FK → contacts)      │
│ ai_agent_id (FK → ai_agents)    │
│ phone                           │
│ status (open/closed)            │
│ mode (bot/human)                │
│ priority                        │
│ unread_count                    │
│ total_messages                  │
│ last_message_at                 │
│ last_message_preview            │
│ automation_paused_until         │
│ automation_paused_by            │
│ handoff_summary                 │
│ created_at                      │
│ updated_at                      │
└────────┬────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────┐
│        inbox_messages           │
├─────────────────────────────────┤
│ id (PK)                         │
│ conversation_id (FK)            │
│ direction (inbound/outbound)    │
│ content                         │
│ message_type                    │
│ media_url                       │
│ whatsapp_message_id             │
│ delivery_status                 │
│ ai_response_id                  │
│ ai_sentiment                    │
│ ai_sources                      │
│ created_at                      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│        ai_agent_logs            │
├─────────────────────────────────┤
│ id (PK)                         │
│ agent_id (FK → ai_agents)       │
│ conversation_id (FK)            │
│ input_text                      │
│ output_text                     │
│ tools_used                      │
│ sources                         │
│ latency_ms                      │
│ error                           │
│ created_at                      │
└─────────────────────────────────┘

┌─────────────────┐       ┌─────────────────────────────────┐
│  inbox_labels   │       │   inbox_conversation_labels     │
├─────────────────┤       ├─────────────────────────────────┤
│ id (PK)         │◄──────│ label_id (FK)                   │
│ name            │       │ conversation_id (FK)            │
│ color           │       │ created_at                      │
│ created_at      │       └─────────────────────────────────┘
└─────────────────┘

┌─────────────────────────────────┐
│      inbox_quick_replies        │
├─────────────────────────────────┤
│ id (PK)                         │
│ title                           │
│ content                         │
│ shortcut                        │
│ created_at                      │
└─────────────────────────────────┘
```

---

## Entity Details

### inbox_conversations

Represents a conversation thread with a contact.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default gen_random_uuid() | Unique identifier |
| contact_id | UUID | FK → contacts.id, nullable | Associated contact |
| ai_agent_id | UUID | FK → ai_agents.id, nullable | Assigned AI agent |
| phone | TEXT | NOT NULL | Phone in E.164 format |
| status | TEXT | NOT NULL, default 'open' | 'open' or 'closed' |
| mode | TEXT | NOT NULL, default 'bot' | 'bot' or 'human' |
| priority | TEXT | default 'normal' | 'low', 'normal', 'high', 'urgent' |
| unread_count | INTEGER | default 0 | Unread inbound messages |
| total_messages | INTEGER | default 0 | Total message count |
| last_message_at | TIMESTAMPTZ | nullable | Last activity timestamp |
| last_message_preview | TEXT | nullable | Preview for list display |
| automation_paused_until | TIMESTAMPTZ | nullable | When automation resumes |
| automation_paused_by | TEXT | nullable | Who paused automation |
| handoff_summary | TEXT | nullable | AI-generated summary on handoff |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | default now() | Last update timestamp |

**Indexes**:
- `idx_inbox_conversations_phone` on (phone)
- `idx_inbox_conversations_mode_status` on (mode, status)
- `idx_inbox_conversations_last_message_at` on (last_message_at DESC)

**Validation**:
- status IN ('open', 'closed')
- mode IN ('bot', 'human')
- priority IN ('low', 'normal', 'high', 'urgent')

---

### inbox_messages

Represents an individual message in a conversation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default gen_random_uuid() | Unique identifier |
| conversation_id | UUID | FK → inbox_conversations.id, NOT NULL | Parent conversation |
| direction | TEXT | NOT NULL | 'inbound' or 'outbound' |
| content | TEXT | NOT NULL | Message text content |
| message_type | TEXT | default 'text' | 'text', 'image', 'audio', 'video', 'document', 'template' |
| media_url | TEXT | nullable | URL for media messages |
| whatsapp_message_id | TEXT | nullable | Meta's message ID |
| delivery_status | TEXT | default 'pending' | 'pending', 'sent', 'delivered', 'read', 'failed' |
| ai_response_id | UUID | nullable | Links to ai_agent_logs |
| ai_sentiment | TEXT | nullable | 'positive', 'neutral', 'negative', 'frustrated' |
| ai_sources | JSONB | nullable | RAG sources used |
| payload | JSONB | nullable | Original webhook payload |
| created_at | TIMESTAMPTZ | default now() | Message timestamp |

**Indexes**:
- `idx_inbox_messages_conversation_id` on (conversation_id)
- `idx_inbox_messages_created_at` on (created_at)
- `idx_inbox_messages_whatsapp_id` on (whatsapp_message_id)

**Validation**:
- direction IN ('inbound', 'outbound')
- message_type IN ('text', 'image', 'audio', 'video', 'document', 'template')
- delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')

---

### ai_agents

Represents a configured AI agent.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default gen_random_uuid() | Unique identifier |
| name | TEXT | NOT NULL | Display name |
| system_prompt | TEXT | NOT NULL | System instructions |
| model | TEXT | default 'gemini-2.5-flash' | LLM model to use |
| temperature | REAL | default 0.7 | Response creativity |
| max_tokens | INTEGER | default 1024 | Max response length |
| file_search_store_id | TEXT | nullable | Google File Search store |
| is_active | BOOLEAN | default true | Whether agent is active |
| is_default | BOOLEAN | default false | Default for new conversations |
| debounce_ms | INTEGER | default 5000 | Message debounce time |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | default now() | Last update timestamp |

**Constraints**:
- Only one agent can have is_default = true

---

### ai_agent_logs

Logs AI interactions for debugging and analytics.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default gen_random_uuid() | Unique identifier |
| agent_id | UUID | FK → ai_agents.id, NOT NULL | Which agent processed |
| conversation_id | UUID | FK → inbox_conversations.id | Which conversation |
| input_text | TEXT | NOT NULL | User's message(s) |
| output_text | TEXT | nullable | AI's response |
| tools_used | JSONB | nullable | Tools called |
| sources | JSONB | nullable | RAG sources returned |
| latency_ms | INTEGER | nullable | Processing time |
| error | TEXT | nullable | Error message if failed |
| created_at | TIMESTAMPTZ | default now() | Log timestamp |

**Indexes**:
- `idx_ai_agent_logs_agent_id` on (agent_id)
- `idx_ai_agent_logs_conversation_id` on (conversation_id)
- `idx_ai_agent_logs_created_at` on (created_at)

---

### inbox_labels

Labels for organizing conversations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default gen_random_uuid() | Unique identifier |
| name | TEXT | NOT NULL, UNIQUE | Label name |
| color | TEXT | default 'gray' | Display color |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

---

### inbox_conversation_labels

Junction table for conversation-label relationships.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| conversation_id | UUID | FK, PK | Conversation reference |
| label_id | UUID | FK, PK | Label reference |
| created_at | TIMESTAMPTZ | default now() | When label was applied |

**Constraints**:
- PRIMARY KEY (conversation_id, label_id)
- ON DELETE CASCADE for both FKs

---

### inbox_quick_replies

Pre-defined quick response templates.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default gen_random_uuid() | Unique identifier |
| title | TEXT | NOT NULL | Display title |
| content | TEXT | NOT NULL | Message content |
| shortcut | TEXT | nullable, UNIQUE | Keyboard shortcut |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

---

## State Transitions

### Conversation Status

```
┌─────────┐    close     ┌─────────┐
│  open   │ ───────────► │ closed  │
└─────────┘              └─────────┘
     ▲                        │
     │         reopen         │
     └────────────────────────┘
```

### Conversation Mode

```
                        handoff (AI detects)
┌─────────┐    ───────────────────────────►    ┌─────────┐
│   bot   │                                    │  human  │
└─────────┘    ◄───────────────────────────    └─────────┘
                   resume automation
```

### Message Delivery Status

```
pending → sent → delivered → read
                    │
                    └──► failed
```

---

## TypeScript Interfaces

```typescript
// types.ts additions

export type ConversationStatus = 'open' | 'closed';
export type ConversationMode = 'bot' | 'human';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'template';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated';

export interface InboxConversation {
  id: string;
  contact_id: string | null;
  ai_agent_id: string | null;
  phone: string;
  status: ConversationStatus;
  mode: ConversationMode;
  priority: ConversationPriority;
  unread_count: number;
  total_messages: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  automation_paused_until: string | null;
  automation_paused_by: string | null;
  handoff_summary: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact;
  labels?: InboxLabel[];
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  whatsapp_message_id: string | null;
  delivery_status: DeliveryStatus;
  ai_response_id: string | null;
  ai_sentiment: Sentiment | null;
  ai_sources: Array<{ title: string; content: string }> | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AIAgent {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  file_search_store_id: string | null;
  is_active: boolean;
  is_default: boolean;
  debounce_ms: number;
  created_at: string;
  updated_at: string;
}

export interface AIAgentLog {
  id: string;
  agent_id: string;
  conversation_id: string;
  input_text: string;
  output_text: string | null;
  tools_used: Array<{ name: string; args: unknown }> | null;
  sources: Array<{ title: string; content: string }> | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface InboxLabel {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface InboxQuickReply {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  created_at: string;
}
```
