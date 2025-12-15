-- campaign_contacts: campos de debug adicionais para troubleshooting/suporte
--
-- Objetivo:
-- - Persistir campos úteis para correlação com a Meta/Graph API:
--   - fbtrace_id (útil em tickets e investigação)
--   - error_subcode (quando existir)
--   - href (link de referência de códigos)
--
-- Observação sobre tamanho:
-- - Esses campos só são preenchidos em falhas.
-- - fbtrace_id/href são pequenos; subcode é inteiro.
-- - Mesmo assim, o app trunca `href` e `details` para evitar payloads grandes.

alter table if exists public.campaign_contacts
  add column if not exists failure_fbtrace_id text;

alter table if exists public.campaign_contacts
  add column if not exists failure_subcode integer;

alter table if exists public.campaign_contacts
  add column if not exists failure_href text;

-- Índices opcionais (úteis em debugging; custo baixo)
create index if not exists idx_campaign_contacts_failure_fbtrace_id
  on public.campaign_contacts (failure_fbtrace_id);

create index if not exists idx_campaign_contacts_failure_subcode
  on public.campaign_contacts (failure_subcode);

-- Índice pragmático para triagem de falhas recentes por campanha
create index if not exists idx_campaign_contacts_failed_recent
  on public.campaign_contacts (campaign_id, failed_at desc)
  where status = 'failed';
