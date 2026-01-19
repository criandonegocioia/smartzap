-- Migration: 0001_add_inbox_and_ai_agents.sql
-- Feature: 001-inbox-ai-agents
-- Description: Create tables for Inbox (live chat) and AI Agents functionality
-- Created: 2026-01-19

-- =============================================================================
-- T008: Create all tables
-- =============================================================================

-- AI Agents table (must be created first due to FK references)
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  temperature REAL NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1024,
  file_search_store_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  debounce_ms INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inbox Conversations
CREATE TABLE IF NOT EXISTS inbox_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ai_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  mode TEXT NOT NULL DEFAULT 'bot',
  priority TEXT NOT NULL DEFAULT 'normal',
  unread_count INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  automation_paused_until TIMESTAMPTZ,
  automation_paused_by TEXT,
  handoff_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inbox Messages
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  whatsapp_message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  ai_response_id UUID,
  ai_sentiment TEXT,
  ai_sources JSONB,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Agent Logs
CREATE TABLE IF NOT EXISTS ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES inbox_conversations(id) ON DELETE SET NULL,
  input_message TEXT NOT NULL,
  output_message TEXT,
  response_time_ms INTEGER,
  model_used TEXT,
  tokens_used INTEGER,
  sources_used JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inbox Labels
CREATE TABLE IF NOT EXISTS inbox_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inbox Conversation Labels (junction table)
CREATE TABLE IF NOT EXISTS inbox_conversation_labels (
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES inbox_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, label_id)
);

-- Inbox Quick Replies
CREATE TABLE IF NOT EXISTS inbox_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- T009: Add indexes for performance
-- =============================================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_inbox_conversations_phone
  ON inbox_conversations(phone);

CREATE INDEX IF NOT EXISTS idx_inbox_conversations_mode_status
  ON inbox_conversations(mode, status);

CREATE INDEX IF NOT EXISTS idx_inbox_conversations_last_message_at
  ON inbox_conversations(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_inbox_conversations_contact_id
  ON inbox_conversations(contact_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation_id
  ON inbox_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_created_at
  ON inbox_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_whatsapp_id
  ON inbox_messages(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- AI Agent Logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_agent_id
  ON ai_agent_logs(ai_agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_conversation_id
  ON ai_agent_logs(conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created_at
  ON ai_agent_logs(created_at);

-- =============================================================================
-- T010: Add RLS policies (single-tenant: all authenticated users have access)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_quick_replies ENABLE ROW LEVEL SECURITY;

-- AI Agents policies
CREATE POLICY "ai_agents_select_authenticated" ON ai_agents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_agents_insert_authenticated" ON ai_agents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ai_agents_update_authenticated" ON ai_agents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ai_agents_delete_authenticated" ON ai_agents
  FOR DELETE TO authenticated USING (true);

-- Inbox Conversations policies
CREATE POLICY "inbox_conversations_select_authenticated" ON inbox_conversations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inbox_conversations_insert_authenticated" ON inbox_conversations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inbox_conversations_update_authenticated" ON inbox_conversations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inbox_conversations_delete_authenticated" ON inbox_conversations
  FOR DELETE TO authenticated USING (true);

-- Inbox Messages policies
CREATE POLICY "inbox_messages_select_authenticated" ON inbox_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inbox_messages_insert_authenticated" ON inbox_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inbox_messages_update_authenticated" ON inbox_messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inbox_messages_delete_authenticated" ON inbox_messages
  FOR DELETE TO authenticated USING (true);

-- AI Agent Logs policies
CREATE POLICY "ai_agent_logs_select_authenticated" ON ai_agent_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_agent_logs_insert_authenticated" ON ai_agent_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ai_agent_logs_update_authenticated" ON ai_agent_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ai_agent_logs_delete_authenticated" ON ai_agent_logs
  FOR DELETE TO authenticated USING (true);

-- Inbox Labels policies
CREATE POLICY "inbox_labels_select_authenticated" ON inbox_labels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inbox_labels_insert_authenticated" ON inbox_labels
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inbox_labels_update_authenticated" ON inbox_labels
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inbox_labels_delete_authenticated" ON inbox_labels
  FOR DELETE TO authenticated USING (true);

-- Inbox Conversation Labels policies
CREATE POLICY "inbox_conversation_labels_select_authenticated" ON inbox_conversation_labels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inbox_conversation_labels_insert_authenticated" ON inbox_conversation_labels
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inbox_conversation_labels_delete_authenticated" ON inbox_conversation_labels
  FOR DELETE TO authenticated USING (true);

-- Inbox Quick Replies policies
CREATE POLICY "inbox_quick_replies_select_authenticated" ON inbox_quick_replies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inbox_quick_replies_insert_authenticated" ON inbox_quick_replies
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inbox_quick_replies_update_authenticated" ON inbox_quick_replies
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inbox_quick_replies_delete_authenticated" ON inbox_quick_replies
  FOR DELETE TO authenticated USING (true);

-- =============================================================================
-- T011: Add check constraints for enum-like columns
-- =============================================================================

ALTER TABLE inbox_conversations
  ADD CONSTRAINT chk_inbox_conversations_status
  CHECK (status IN ('open', 'closed'));

ALTER TABLE inbox_conversations
  ADD CONSTRAINT chk_inbox_conversations_mode
  CHECK (mode IN ('bot', 'human'));

ALTER TABLE inbox_conversations
  ADD CONSTRAINT chk_inbox_conversations_priority
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE inbox_messages
  ADD CONSTRAINT chk_inbox_messages_direction
  CHECK (direction IN ('inbound', 'outbound'));

ALTER TABLE inbox_messages
  ADD CONSTRAINT chk_inbox_messages_type
  CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'template'));

ALTER TABLE inbox_messages
  ADD CONSTRAINT chk_inbox_messages_delivery_status
  CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed'));

ALTER TABLE inbox_messages
  ADD CONSTRAINT chk_inbox_messages_sentiment
  CHECK (ai_sentiment IS NULL OR ai_sentiment IN ('positive', 'neutral', 'negative', 'frustrated'));

-- =============================================================================
-- T012: Add unique constraint for ai_agents.is_default (only one can be true)
-- =============================================================================

-- Partial unique index: only one agent can be default
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agents_single_default
  ON ai_agents (is_default)
  WHERE is_default = true;

-- =============================================================================
-- T013: Add trigger for updated_at auto-update
-- =============================================================================

-- Create or replace the trigger function (may already exist from baseline)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inbox_conversations
DROP TRIGGER IF EXISTS update_inbox_conversations_updated_at ON inbox_conversations;
CREATE TRIGGER update_inbox_conversations_updated_at
  BEFORE UPDATE ON inbox_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ai_agents
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Enable Realtime for inbox tables
-- =============================================================================

-- Enable realtime for conversation updates
ALTER PUBLICATION supabase_realtime ADD TABLE inbox_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE inbox_messages;

-- =============================================================================
-- Insert default AI Agent (optional - can be created via UI)
-- =============================================================================

-- Only insert if no agents exist
INSERT INTO ai_agents (name, system_prompt, is_default)
SELECT
  'Assistente Padrão',
  'Você é um assistente de atendimento ao cliente amigável e prestativo. Responda em português brasileiro de forma clara e concisa. Se não souber a resposta, admita e ofereça alternativas.',
  true
WHERE NOT EXISTS (SELECT 1 FROM ai_agents LIMIT 1);
