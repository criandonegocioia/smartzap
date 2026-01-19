---
parent_branch: main
feature_number: 001
status: Planning Complete
created_at: 2026-01-19T13:30:00-03:00
plan_completed_at: 2026-01-19
---

# Feature: Inbox + AI Agents

## Overview

Implementar um módulo completo de **Live Chat (Inbox)** combinado com **AI Agents** inteligentes para o SmartZap, permitindo que a empresa gerencie conversas com leads em tempo real enquanto agentes de IA respondem automaticamente usando conhecimento de uma base de documentos.

Atualmente, todas as mensagens inbound (recebidas dos clientes) são descartadas após processamento pelo webhook. Esta feature resolve isso persistindo todas as mensagens e criando uma interface unificada para atendimento humano + IA.

**Inspiração**: ManyChat Inbox + AI Agents

## Clarifications

### Session 2026-01-19
- Q: Quando o AI Agent falhar (timeout, erro de API), o que acontece? → A: Retry 1x, se falhar faz handoff automático para humano com alerta explicando o erro
- Q: Por quanto tempo mensagens/conversas são retidas? → A: Período configurável pelo admin nas configurações
- Q: Se lead enviar várias mensagens rápidas, AI responde cada uma? → A: Debounce configurável (padrão: 5 segundos de silêncio antes de responder)

## User Scenarios

### Cenário 1: Operador visualiza conversas em tempo real
**Como** operador de atendimento
**Quero** ver todas as conversas abertas com leads em uma interface unificada
**Para que** eu possa acompanhar e responder conversas que precisam de atenção humana

**Fluxo**:
1. Operador acessa a página "Inbox" no dashboard
2. Sistema exibe lista de conversas ordenadas por última mensagem
3. Conversas não lidas aparecem destacadas com badge de contagem
4. Operador clica em uma conversa para ver histórico completo
5. Mensagens novas aparecem em tempo real sem refresh

### Cenário 2: AI Agent responde automaticamente
**Como** lead entrando em contato
**Quero** receber respostas rápidas e relevantes
**Para que** minhas dúvidas sejam resolvidas mesmo fora do horário comercial

**Fluxo**:
1. Lead envia mensagem no WhatsApp
2. Sistema persiste mensagem e identifica conversa
3. AI Agent analisa a mensagem e busca contexto na base de conhecimento
4. AI gera resposta personalizada usando nome do lead
5. Resposta é enviada automaticamente via WhatsApp
6. Sistema detecta sentimento e urgência da conversa

### Cenário 3: Handoff inteligente para humano
**Como** lead frustrado ou com problema complexo
**Quero** ser transferido para um atendente humano
**Para que** meu problema seja resolvido por alguém com autoridade

**Fluxo**:
1. Lead expressa frustração ("cansei disso", "não funciona nada")
2. AI detecta sentimento negativo semanticamente (não por keywords)
3. AI decide chamar ferramenta de handoff automaticamente
4. Conversa é marcada como "modo humano" com prioridade ajustada
5. Operador recebe notificação de conversa urgente
6. AI gera resumo da conversa para contexto do operador

### Cenário 4: Configuração de AI Agent
**Como** administrador do sistema
**Quero** configurar o comportamento do AI Agent
**Para que** as respostas reflitam a identidade da empresa

**Fluxo**:
1. Admin acessa configurações de AI Agents
2. Define nome, personalidade e prompt do sistema
3. Faz upload de arquivos para base de conhecimento (FAQ, preços, produtos)
4. Testa o agent em chat ao vivo antes de ativar
5. Ativa o agent para responder conversas automaticamente

### Cenário 5: Pausar automação temporariamente
**Como** operador atendendo um lead
**Quero** pausar a automação (bot/workflow) temporariamente
**Para que** eu possa atender manualmente sem interferência

**Fluxo**:
1. Operador seleciona conversa no Inbox
2. Clica em "Pausar automação" por X minutos
3. Sistema marca conversa como "modo humano"
4. Bot e workflows não respondem enquanto pausado
5. Após tempo definido, automação resume automaticamente

## Functional Requirements

### FR1: Persistência de Mensagens
- O sistema DEVE persistir todas as mensagens inbound recebidas pelo webhook
- O sistema DEVE criar ou identificar a conversa associada ao número de telefone
- O sistema DEVE registrar metadados: tipo de mensagem, mídia, timestamp, payload original
- O sistema DEVE atualizar contadores automaticamente (mensagens, não lidas, inbound/outbound)

### FR2: Interface de Inbox
- O sistema DEVE exibir lista de conversas com preview da última mensagem
- O sistema DEVE ordenar conversas por última atividade (mais recente primeiro)
- O sistema DEVE destacar conversas com mensagens não lidas
- O sistema DEVE permitir filtrar por: status (aberta/fechada), modo (bot/humano), labels
- O sistema DEVE exibir histórico completo de mensagens ao selecionar conversa
- O sistema DEVE atualizar em tempo real quando novas mensagens chegarem

### FR3: Envio de Mensagens
- O sistema DEVE permitir enviar mensagens de texto pelo Inbox
- O sistema DEVE permitir enviar templates pré-aprovados
- O sistema DEVE persistir mensagens outbound com status de entrega
- O sistema DEVE exibir status de entrega (enviado, entregue, lido, falhou)

### FR4: AI Agent - Respostas Automáticas
- O sistema DEVE processar mensagens inbound com AI quando modo = "bot"
- O sistema DEVE usar base de conhecimento (File Search) para contextualizar respostas
- O sistema DEVE retornar resposta estruturada: texto + sentimento + tags sugeridas
- O sistema DEVE persistir logs de interações do AI (entrada, saída, sources, tempo)
- O sistema DEVE aplicar debounce configurável (padrão: 5s) antes de processar mensagens consecutivas
- O sistema DEVE fazer retry 1x em caso de falha do AI, seguido de handoff automático com alerta se persistir

### FR5: Handoff Inteligente
- O AI DEVE detectar necessidade de handoff semanticamente (não por keywords)
- O AI DEVE considerar: frustração, pedido de humano, assuntos sensíveis, múltiplas falhas
- O sistema DEVE alternar modo da conversa para "humano" quando handoff ocorrer
- O sistema DEVE ajustar prioridade baseado na urgência detectada
- O sistema DEVE gerar resumo da conversa para contexto do operador

### FR6: Gestão de AI Agents
- O sistema DEVE permitir criar múltiplos AI Agents com configurações distintas
- O sistema DEVE permitir definir: nome, prompt do sistema, modelo, temperatura
- O sistema DEVE permitir associar base de conhecimento (File Search Store)
- O sistema DEVE permitir testar agent em chat ao vivo antes de ativar
- O sistema DEVE permitir definir agent padrão para novas conversas

### FR7: Base de Conhecimento (RAG)
- O sistema DEVE permitir upload de arquivos para indexação
- O sistema DEVE suportar formatos: PDF, TXT, JSON, MD
- O sistema DEVE exibir status de indexação (pendente, indexando, indexado)
- O sistema DEVE usar conteúdo indexado para contextualizar respostas do AI

### FR8: Controle de Automação
- O sistema DEVE permitir pausar automação por tempo definido
- O sistema DEVE resumir automação automaticamente após período
- O sistema DEVE registrar quem pausou e quando
- O sistema DEVE integrar com workflows existentes (pause/resume)

### FR9: Organização
- O sistema DEVE permitir criar e gerenciar labels para conversas
- O sistema DEVE permitir criar respostas rápidas (quick replies)
- O sistema DEVE permitir fechar e reabrir conversas

### FR10: Retenção de Dados
- O sistema DEVE permitir configurar período de retenção de mensagens/conversas
- O sistema DEVE arquivar ou deletar conversas fechadas após período configurado
- O sistema DEVE manter configuração de retenção acessível nas configurações do admin

## Success Criteria

| Critério | Métrica | Meta |
|----------|---------|------|
| Persistência de mensagens | % de mensagens inbound persistidas | 100% |
| Latência de atualização | Tempo para nova mensagem aparecer no Inbox | < 2 segundos |
| Tempo de resposta do AI | Latência da geração de resposta | < 3 segundos |
| Precisão do handoff | % de handoffs corretos (sem falsos positivos/negativos) | > 90% |
| Satisfação do operador | Consegue atender conversas eficientemente | Tarefas completadas sem bloqueios |
| Relevância das respostas AI | Respostas usam contexto da base de conhecimento | Sources citados quando aplicável |

## Key Entities

### InboxConversation
- Representa uma thread de conversa com um contato
- Contém: phone, status (open/closed), mode (bot/human), counters, timestamps, labels
- Relaciona com: Contact, InboxMessages, AIAgent

### InboxMessage
- Representa uma mensagem individual (inbound ou outbound)
- Contém: direction, content, type, delivery_status, ai_analysis
- Relaciona com: InboxConversation, Contact

### AIAgent
- Representa um agente de IA configurado
- Contém: name, system_prompt, model_config, file_search_store_id
- Relaciona com: AIAgentLogs, InboxConversations (assigned)

### InboxLabel
- Representa uma label para organização
- Contém: name, color, conversation_count

### InboxQuickReply
- Representa uma resposta rápida pré-definida
- Contém: title, content, shortcut

## Assumptions

1. **Infraestrutura existente**: O webhook WhatsApp já está funcional e recebe mensagens
2. **Supabase Realtime**: O CentralizedRealtimeProvider já está implementado e funcional
3. **Vercel AI SDK v6**: Será utilizada a versão 6 do AI SDK com ToolLoopAgent
4. **Google Gemini**: Modelo Gemini 2.5 Flash será usado para AI (File Search nativo)
5. **Custo de indexação**: Google cobra $0.15/1M tokens para indexação; storage e query são gratuitos
6. **Single tenant**: O sistema opera em modo single-tenant (uma conta WhatsApp)
7. **Navegadores suportados**: Chrome, Firefox, Safari, Edge (versões recentes)
8. **Conexão estável**: Operadores têm conexão de internet estável para Realtime funcionar
9. **Volume inicial**: Sistema deve suportar até 1000 conversas ativas simultaneamente
10. **Idioma**: Interface e respostas do AI em Português (pt-BR)

## Out of Scope

- Múltiplos operadores com assignment de conversas
- Métricas avançadas e dashboards de performance
- Integração com CRM externos
- Chatbot com árvore de decisão (apenas AI generativo)
- Notificações push para operadores
- App mobile para operadores
- Suporte a múltiplas contas WhatsApp (multi-tenant)
