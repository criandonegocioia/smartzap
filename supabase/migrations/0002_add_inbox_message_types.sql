-- Migration: 0002_add_inbox_message_types.sql
-- Feature: 001-inbox-ai-agents
-- Description: Add additional message types for inbox (interactive, internal_note)
-- Created: 2026-01-19

-- =============================================================================
-- Drop and recreate message_type constraint with additional types
-- =============================================================================

-- Drop existing constraint
ALTER TABLE inbox_messages
  DROP CONSTRAINT IF EXISTS chk_inbox_messages_type;

-- Add new constraint with additional types
ALTER TABLE inbox_messages
  ADD CONSTRAINT chk_inbox_messages_type
  CHECK (message_type IN (
    'text',
    'image',
    'audio',
    'video',
    'document',
    'template',
    'interactive',  -- WhatsApp interactive messages (buttons, lists)
    'internal_note' -- Internal notes (e.g., AI handoff notes)
  ));

-- =============================================================================
-- Add delivery timestamp columns for detailed tracking
-- =============================================================================

-- Add columns if they don't exist
ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;
