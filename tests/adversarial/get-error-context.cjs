const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function getErrorContext() {
  // Busca o momento exato do erro
  const { data: errorMsg } = await supabase
    .from('inbox_messages')
    .select('id, created_at, conversation_id')
    .ilike('content', '%LLM did not call respond tool%')
    .single();

  if (!errorMsg) {
    console.log('Erro não encontrado');
    return;
  }

  console.log('Erro encontrado em:', errorMsg.created_at);

  // Busca as 20 mensagens ANTERIORES ao erro
  const { data: msgs } = await supabase
    .from('inbox_messages')
    .select('direction, content, created_at')
    .eq('conversation_id', errorMsg.conversation_id)
    .lt('created_at', errorMsg.created_at)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\n=== CONTEXTO ANTES DO ERRO (mais recentes primeiro) ===\n');

  msgs?.forEach((m, i) => {
    const prefix = m.direction === 'inbound' ? '👤 USER:' : '🤖 BOT:';
    const content = m.content?.slice(0, 100) || '';
    console.log('[' + (i+1) + '] ' + prefix + ' ' + content + (m.content?.length > 100 ? '...' : ''));
  });

  // Mostra a mensagem que causou o erro
  console.log('\n=== MENSAGEM QUE CAUSOU O ERRO ===\n');

  // Busca a mensagem inbound imediatamente antes do erro
  const { data: triggerMsg } = await supabase
    .from('inbox_messages')
    .select('content')
    .eq('conversation_id', errorMsg.conversation_id)
    .eq('direction', 'inbound')
    .lt('created_at', errorMsg.created_at)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (triggerMsg) {
    console.log('TRIGGER: "' + triggerMsg.content + '"');
  }
}

getErrorContext();
