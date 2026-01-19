-- Migration: 0003_add_ai_knowledge_files.sql
-- Feature: 001-inbox-ai-agents (T057)
-- Description: Create table for AI Agent knowledge base files
-- Created: 2026-01-19

-- =============================================================================
-- AI Knowledge Files table
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/plain',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  content TEXT,
  external_file_id TEXT,
  external_file_uri TEXT,
  indexing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_files_agent_id
  ON ai_knowledge_files(agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_files_created_at
  ON ai_knowledge_files(created_at DESC);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE ai_knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_knowledge_files_select_authenticated" ON ai_knowledge_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_knowledge_files_insert_authenticated" ON ai_knowledge_files
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ai_knowledge_files_update_authenticated" ON ai_knowledge_files
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ai_knowledge_files_delete_authenticated" ON ai_knowledge_files
  FOR DELETE TO authenticated USING (true);

-- =============================================================================
-- Constraints
-- =============================================================================

ALTER TABLE ai_knowledge_files
  ADD CONSTRAINT chk_ai_knowledge_files_indexing_status
  CHECK (indexing_status IN ('pending', 'processing', 'completed', 'failed', 'local_only'));

-- =============================================================================
-- Trigger for updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS update_ai_knowledge_files_updated_at ON ai_knowledge_files;
CREATE TRIGGER update_ai_knowledge_files_updated_at
  BEFORE UPDATE ON ai_knowledge_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
