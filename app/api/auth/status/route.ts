/**
 * Auth Status API
 * 
 * GET: Check current auth status (setup complete? authenticated? configured?)
 */

import { NextResponse } from 'next/server'
import { getUserAuthStatus } from '@/lib/user-auth'

// Este endpoint controla redirects do login.
// No Edge, env vars/SDK podem se comportar diferente e fazer isSetup/isAuthenticated
// voltarem como false, gerando loop para o wizard.
export const runtime = 'nodejs'

// Evita cache/stale data (status de sessão/setup precisa ser sempre atual)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production'
    const log = (...args: any[]) => {
      if (!isProd) console.log(...args)
    }

    // #region agent log
    const envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const envSupabaseHost = envSupabaseUrl ? (() => {
      try { return new URL(envSupabaseUrl).hostname } catch { return 'invalid' }
    })() : 'missing'
    fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'app/api/auth/status/route.ts:25',message:'Auth status env snapshot',data:{nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV,nextRuntime:process.env.NEXT_RUNTIME,nodeVersion:process.versions?.node||'unknown',hasMasterPassword:!!process.env.MASTER_PASSWORD,masterLength:process.env.MASTER_PASSWORD?process.env.MASTER_PASSWORD.length:0,setupComplete:process.env.SETUP_COMPLETE,hasSupabaseUrl:!!envSupabaseUrl,supabaseHost:envSupabaseHost},timestamp:Date.now()})}).catch(()=>{});
    console.log('[debug][auth-status] env snapshot', { nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV, nextRuntime: process.env.NEXT_RUNTIME, nodeVersion: process.versions?.node || 'unknown', hasMasterPassword: !!process.env.MASTER_PASSWORD, masterLength: process.env.MASTER_PASSWORD ? process.env.MASTER_PASSWORD.length : 0, setupComplete: process.env.SETUP_COMPLETE, supabaseHost: envSupabaseHost });
    // #endregion

    log('🔍 [AUTH-STATUS] === START ===')
    // Check if MASTER_PASSWORD is configured
    log('🔍 [AUTH-STATUS] MASTER_PASSWORD exists:', !!process.env.MASTER_PASSWORD)
    log('🔍 [AUTH-STATUS] VERCEL_TOKEN exists:', !!process.env.VERCEL_TOKEN)
    log('🔍 [AUTH-STATUS] SETUP_COMPLETE exists:', !!process.env.SETUP_COMPLETE)
    const isConfigured = !!process.env.MASTER_PASSWORD

    if (!isConfigured) {
      log('🔍 [AUTH-STATUS] Not configured, returning early')
      return NextResponse.json({
        isConfigured: false,
        debug_master_password_exists: !!process.env.MASTER_PASSWORD,
        debug_vercel_token_exists: !!process.env.VERCEL_TOKEN,
        isSetup: false,
        isAuthenticated: false,
        company: null
      })
    }

    log('🔍 [AUTH-STATUS] Calling getUserAuthStatus...')
    const status = await getUserAuthStatus()
    log('🔍 [AUTH-STATUS] getUserAuthStatus result:', JSON.stringify(status, null, 2))

    const response = {
      isConfigured: true,
      isSetup: status.isSetup,
      isAuthenticated: status.isAuthenticated,
      company: status.company
    }

    log('🔍 [AUTH-STATUS] Final response:', JSON.stringify(response, null, 2))
    return NextResponse.json(response)
  } catch (error) {
    console.error('Auth status error:', error)
    return NextResponse.json(
      { error: 'Failed to check auth status' },
      { status: 500 }
    )
  }
}
