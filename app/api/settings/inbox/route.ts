/**
 * T071: Inbox Settings API
 * Manages inbox-related configuration like retention days
 */

import { NextRequest, NextResponse } from 'next/server'
import { settingsDb } from '@/lib/supabase-db'
import { z } from 'zod'

const INBOX_RETENTION_KEY = 'inbox_retention_days'
const DEFAULT_RETENTION_DAYS = 90

const InboxSettingsSchema = z.object({
  retention_days: z.number().int().min(7).max(365).optional(),
})

export async function GET() {
  try {
    const raw = await settingsDb.get(INBOX_RETENTION_KEY)
    const retentionDays = raw ? parseInt(raw, 10) : DEFAULT_RETENTION_DAYS

    return NextResponse.json({
      retention_days: isNaN(retentionDays) ? DEFAULT_RETENTION_DAYS : retentionDays,
    })
  } catch (error) {
    console.error('[inbox-settings] GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar configurações do inbox' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = InboxSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { retention_days } = parsed.data

    if (retention_days !== undefined) {
      await settingsDb.set(INBOX_RETENTION_KEY, String(retention_days))
    }

    // Return updated settings
    const raw = await settingsDb.get(INBOX_RETENTION_KEY)
    const currentRetention = raw ? parseInt(raw, 10) : DEFAULT_RETENTION_DAYS

    return NextResponse.json({
      retention_days: isNaN(currentRetention) ? DEFAULT_RETENTION_DAYS : currentRetention,
      message: 'Configurações salvas',
    })
  } catch (error) {
    console.error('[inbox-settings] PATCH error:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações do inbox' },
      { status: 500 }
    )
  }
}
