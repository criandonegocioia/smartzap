const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function analyze() {
  // Busca o erro
  const { data: errorMsg } = await supabase
    .from('inbox_messages')
    .select('conversation_id, created_at')
    .ilike('content', '%LLM did not call respond tool%')
    .single();

  if (!errorMsg) {
    console.log('Erro não encontrado');
    return;
  }

  // Conta mensagens ANTES do erro
  const { count: beforeError } = await supabase
    .from('inbox_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', errorMsg.conversation_id)
    .lt('created_at', errorMsg.created_at);

  // Conta total agora
  const { count: total } = await supabase
    .from('inbox_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', errorMsg.conversation_id);

  console.log('=== ANÁLISE DO CONTEXTO DO ERRO ===\n');
  console.log('Mensagens ANTES do erro:', beforeError);
  console.log('Total de mensagens agora:', total);
  console.log('\n💡 O erro aconteceu com ' + beforeError + ' mensagens de contexto acumulado!');
  console.log('   Isso pode ter sobrecarregado o LLM ou criado confusão de estado.');
}

analyze();
