/**
 * Login API
 * 
 * POST: Login with password
 */

import { NextRequest, NextResponse } from 'next/server'
import { loginUser, isSetupComplete } from '@/lib/user-auth'

export async function POST(request: NextRequest) {
  try {
    // Check if setup is complete
    const setupComplete = await isSetupComplete()
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'app/api/auth/login/route.ts:12',message:'Login setupComplete check',data:{setupComplete,nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV,nextRuntime:process.env.NEXT_RUNTIME,nodeVersion:process.versions?.node||'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!setupComplete) {
      return NextResponse.json(
        { error: 'Setup não concluído', needsSetup: true },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { password } = body
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'app/api/auth/login/route.ts:22',message:'Login payload received',data:{hasPassword:!!password,passwordLength:typeof password==='string'?password.length:0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    
    if (!password) {
      return NextResponse.json(
        { error: 'Senha é obrigatória' },
        { status: 400 }
      )
    }
    
    const result = await loginUser(password)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'app/api/auth/login/route.ts:31',message:'Login result',data:{success:result.success,error:result.error||null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: true,
      company: result.company
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    )
  }
}
