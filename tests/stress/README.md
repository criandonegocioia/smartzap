# SmartZap Stress Test

Simula carga de até 1000 clientes únicos enviando mensagens simultaneamente para validar capacidade do sistema.

## Arquitetura

```
run-stress-test.ts
    ├── config.ts           # Configuração de fases, thresholds
    ├── webhook-payload.ts  # Gerador de payloads realistas
    └── metrics-collector.ts # Coleta e agregação de métricas
```

## Uso

```bash
# Teste rápido (10 VUs, 10s)
npm run test:stress -- --quick

# Teste local padrão
npm run test:stress:local

# Teste customizado
npm run test:stress -- --vus=100 --duration=60

# Teste em produção
npm run test:stress:prod
```

## Fases de Teste

### Perfil Padrão (`DEFAULT_CONFIG`)

| Fase     | VUs | Duração |
|----------|-----|---------|
| warmup   | 5   | 10s     |
| ramp-up  | 50  | 30s     |
| peak     | 100 | 60s     |
| cooldown | 10  | 10s     |

### Perfil Agressivo (`AGGRESSIVE_CONFIG`)

| Fase      | VUs  | Duração |
|-----------|------|---------|
| warmup    | 10   | 10s     |
| ramp-1    | 100  | 20s     |
| ramp-2    | 500  | 20s     |
| peak      | 1000 | 60s     |
| sustained | 1000 | 120s    |
| cooldown  | 50   | 20s     |

## Thresholds (Metas)

| Métrica           | Alvo    |
|-------------------|---------|
| p50 Response Time | < 500ms |
| p95 Response Time | < 2s    |
| p99 Response Time | < 5s    |
| Error Rate        | < 1%    |
| Throughput        | > 100/s |

## Relatórios

Os relatórios são gerados em `tests/stress/reports/`:

- `stress-test-{timestamp}.json` - Métricas completas em JSON
- `stress-test-timeline-{timestamp}.csv` - Timeline para gráficos
- `stress-test-report-{timestamp}.txt` - Relatório legível

## Como Funciona

1. **Geração de Telefones Únicos**: Cada requisição usa um número de telefone único (`+5511900XXXXXX`) para evitar rate limits de pair
2. **Payloads Realistas**: Simula webhook do WhatsApp Cloud API com mensagens variadas
3. **Workers Paralelos**: Cada fase cria N workers que enviam requisições continuamente
4. **Coleta de Métricas**: Latência, status, erros são coletados para cada requisição
5. **Agregação**: Calcula percentis, throughput, taxa de erro ao final

## Limitações

- **Não testa AI real**: O webhook processa a mensagem, mas AI é assíncrona via QStash
- **Não testa rate limits reais**: Usa números únicos para evitar pair limit
- **Mede latência do webhook**: Não mede tempo total de resposta ao usuário

## Exemplo de Output

```
╔══════════════════════════════════════════════════════════════════╗
║                    STRESS TEST REPORT                            ║
╠══════════════════════════════════════════════════════════════════╣
║  Status: ✅ PASSED                                               ║
╠══════════════════════════════════════════════════════════════════╣

📊 RESUMO
────────────────────────────────────────────────────────────────────
  Total de requisições:  5,234
  Sucesso:               5,180 (99.97%)
  Erros:                 54 (0.03%)
  Throughput:            87.2 req/s

⏱️  LATÊNCIA
────────────────────────────────────────────────────────────────────
  Mínimo:   45ms
  Máximo:   2,341ms
  Média:    287ms
  p50:      234ms ✓
  p95:      876ms ✓
  p99:      1,542ms ✓
```

## Troubleshooting

### "CONNECTION_REFUSED"

O servidor de desenvolvimento não está rodando:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:stress:local -- --quick
```

### Timeouts excessivos

Aumente o timeout no `config.ts`:

```typescript
requestTimeout: 60000, // 60s
```

### Sem relatórios

Verifique permissões de escrita no diretório `tests/stress/reports/`.
