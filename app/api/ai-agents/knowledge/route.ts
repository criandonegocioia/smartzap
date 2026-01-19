/**
 * T057: Knowledge Base API
 * Manage knowledge base files for AI agents
 * Integrates with Google File Search (Gemini)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const uploadFileSchema = z.object({
  agent_id: z.string().uuid('ID do agente inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  mime_type: z.string().default('text/plain'),
})

// GET - List knowledge base files for an agent
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')

    if (!agentId) {
      return NextResponse.json(
        { error: 'agent_id é obrigatório' },
        { status: 400 }
      )
    }

    // Validate agent exists
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      )
    }

    // Get knowledge base files
    const { data: files, error } = await supabase
      .from('ai_knowledge_files')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[knowledge] Error fetching files:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar arquivos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ files: files || [] })
  } catch (error) {
    console.error('[knowledge] GET Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Upload a new knowledge base file
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate body
    const parsed = uploadFileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { agent_id, name, content, mime_type } = parsed.data

    // Validate agent exists
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('id, file_search_store_id')
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      )
    }

    // Get Gemini API key for file upload
    const { data: settings } = await supabase
      .from('settings')
      .select('gemini_api_key')
      .single()

    const apiKey = settings?.gemini_api_key || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key do Gemini não configurada' },
        { status: 500 }
      )
    }

    // Upload file to Gemini File API
    let fileUri: string | null = null
    let fileId: string | null = null

    try {
      // Create a blob from the content
      const blob = new Blob([content], { type: mime_type })

      // Upload to Gemini Files API
      const formData = new FormData()
      formData.append('file', blob, name)

      const uploadResponse = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Command': 'start, upload, finalize',
            'X-Goog-Upload-Header-Content-Length': blob.size.toString(),
            'X-Goog-Upload-Header-Content-Type': mime_type,
          },
          body: blob,
        }
      )

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('[knowledge] Gemini upload error:', errorText)
        // Continue without file upload - save locally only
      } else {
        const uploadResult = await uploadResponse.json()
        fileUri = uploadResult.file?.uri
        fileId = uploadResult.file?.name
      }
    } catch (uploadError) {
      console.error('[knowledge] File upload error:', uploadError)
      // Continue without external file - save locally only
    }

    // Save file metadata to database
    const { data: file, error } = await supabase
      .from('ai_knowledge_files')
      .insert({
        agent_id,
        name,
        mime_type,
        size_bytes: new TextEncoder().encode(content).length,
        content,
        external_file_id: fileId,
        external_file_uri: fileUri,
        indexing_status: fileUri ? 'processing' : 'local_only',
      })
      .select()
      .single()

    if (error) {
      console.error('[knowledge] Error saving file:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar arquivo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ file }, { status: 201 })
  } catch (error) {
    console.error('[knowledge] POST Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a knowledge base file
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')

    if (!fileId) {
      return NextResponse.json(
        { error: 'id é obrigatório' },
        { status: 400 }
      )
    }

    // Get file to check for external file
    const { data: file, error: fileError } = await supabase
      .from('ai_knowledge_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Try to delete from Gemini if external file exists
    if (file.external_file_id) {
      try {
        const { data: settings } = await supabase
          .from('settings')
          .select('gemini_api_key')
          .single()

        const apiKey = settings?.gemini_api_key || process.env.GEMINI_API_KEY

        if (apiKey) {
          await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${file.external_file_id}?key=${apiKey}`,
            { method: 'DELETE' }
          )
        }
      } catch (deleteError) {
        console.error('[knowledge] Error deleting external file:', deleteError)
        // Continue with local deletion even if external fails
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('ai_knowledge_files')
      .delete()
      .eq('id', fileId)

    if (error) {
      console.error('[knowledge] Error deleting file:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir arquivo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deleted: fileId })
  } catch (error) {
    console.error('[knowledge] DELETE Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
