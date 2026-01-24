#!/usr/bin/env tsx
/**
 * Script Principal do Stress Test
 *
 * Executa fases de teste, controla concorrência e gera relatórios.
 *
 * Uso:
 *   npx tsx tests/stress/run-stress-test.ts
 *   npx tsx tests/stress/run-stress-test.ts --target=http://localhost:3000 --quick
 *   npx tsx tests/stress/run-stress-test.ts --vus=100 --duration=60
 */

import { buildConfig, type StressTestConfig, type TestPhase } from './config'
import { generateWebhookPayload, generateUniquePhone, getRandomMessage } from './webhook-payload'
import { MetricsCollector } from './metrics-collector'

// Estado global
let collector: MetricsCollector
let config: StressTestConfig
let isRunning = false
let shouldStop = false
let totalRequestsSent = 0
let phoneIndex = 0

/**
 * Log com timestamp
 */
function log(message: string): void {
  const timestamp = new Date().toISOString().slice(11, 23)
  console.log(`[${timestamp}] ${message}`)
}

/**
 * Envia uma requisição ao webhook
 */
async function sendRequest(phone: string): Promise<void> {
  const payload = generateWebhookPayload({
    phone,
    message: getRandomMessage(),
  })

  const startTime = Date.now()

  try {
    const response = await fetch(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header opcional para identificar tráfego de teste
        'X-Stress-Test': 'true',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.requestTimeout),
    })

    const duration = Date.now() - startTime
    const isError = !response.ok

    let errorCode: string | undefined
    let errorMessage: string | undefined

    if (isError) {
      try {
        const body = await response.json()
        errorCode = body.error?.code || body.code
        errorMessage = body.error?.message || body.message
      } catch {
        errorCode = `HTTP_${response.status}`
      }
    }

    collector.record({
      startTime,
      duration,
      status: response.status,
      isError,
      errorCode,
      errorMessage,
    })

    totalRequestsSent++
  } catch (error) {
    const duration = Date.now() - startTime

    let errorCode = 'UNKNOWN'
    let errorMessage = 'Unknown error'

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        errorCode = 'TIMEOUT'
        errorMessage = 'Request timeout'
      } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        errorCode = 'CONNECTION_REFUSED'
        errorMessage = 'Server not reachable'
      } else {
        errorCode = error.name
        errorMessage = error.message
      }
    }

    collector.record({
      startTime,
      duration,
      status: 0,
      isError: true,
      errorCode,
      errorMessage,
    })

    totalRequestsSent++
  }
}

/**
 * Worker que envia requisições continuamente
 */
async function worker(workerId: number, stopSignal: () => boolean): Promise<void> {
  while (!stopSignal()) {
    // Cada worker pega um número de telefone único
    const myPhoneIndex = phoneIndex++
    const phone = generateUniquePhone(myPhoneIndex % 100000) // Cicla após 100k números

    await sendRequest(phone)

    // Pequeno delay entre requisições do mesmo worker (evita sobrecarga do client)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

/**
 * Executa uma fase do teste
 */
async function runPhase(phase: TestPhase): Promise<void> {
  log(`📍 Iniciando fase: ${phase.name} (${phase.vus} VUs por ${phase.duration}s)`)

  collector.setPhase(phase.name)

  const phaseEnd = Date.now() + (phase.duration * 1000)
  const stopSignal = () => shouldStop || Date.now() >= phaseEnd

  // Cria workers
  const workers: Promise<void>[] = []
  for (let i = 0; i < phase.vus; i++) {
    workers.push(worker(i, stopSignal))
  }

  // Progress updates
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - (phaseEnd - phase.duration * 1000)) / 1000)
    const rps = totalRequestsSent / Math.max(1, elapsed)
    process.stdout.write(`\r   ⏳ ${elapsed}/${phase.duration}s | ${totalRequestsSent} reqs | ${rps.toFixed(1)} req/s     `)
  }, 1000)

  // Aguarda todos os workers
  await Promise.all(workers)

  clearInterval(progressInterval)
  process.stdout.write('\r')
  log(`   ✅ Fase ${phase.name} concluída: ${totalRequestsSent} requisições`)
}

/**
 * Executa o stress test completo
 */
async function runStressTest(): Promise<void> {
  isRunning = true
  shouldStop = false
  totalRequestsSent = 0
  phoneIndex = 0

  collector = new MetricsCollector()
  collector.start()

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    SMARTZAP STRESS TEST                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Target: ${config.targetUrl.padEnd(53)}║
║  Phases: ${config.phases.length.toString().padEnd(53)}║
╚══════════════════════════════════════════════════════════════════╝
`)

  const testStart = Date.now()

  // Executa cada fase
  for (const phase of config.phases) {
    if (shouldStop) break
    await runPhase(phase)
  }

  const testDuration = (Date.now() - testStart) / 1000

  log(`\n🏁 Teste concluído em ${testDuration.toFixed(1)}s\n`)

  // Gera métricas e relatório
  const metrics = collector.aggregate()
  const report = collector.generateReport(metrics)

  console.log(report)

  // Exporta relatórios
  try {
    const jsonPath = await collector.exportJson(metrics, config.reportsDir)
    const csvPath = await collector.exportCsv(metrics, config.reportsDir)
    const reportPath = await collector.exportReport(metrics, config.reportsDir)

    log(`📁 Relatórios salvos:`)
    log(`   JSON:   ${jsonPath}`)
    log(`   CSV:    ${csvPath}`)
    log(`   Report: ${reportPath}`)
  } catch (error) {
    log(`⚠️  Erro ao salvar relatórios: ${error}`)
  }

  // Retorna código de saída baseado nos thresholds
  const { passed } = collector.checkThresholds(metrics)
  isRunning = false

  if (!passed) {
    process.exit(1)
  }
}

/**
 * Trata sinal de interrupção
 */
function handleSignal(): void {
  if (isRunning) {
    log('\n⚠️  Interrompendo teste... (aguarde finalização)')
    shouldStop = true
  } else {
    process.exit(0)
  }
}

// Setup
process.on('SIGINT', handleSignal)
process.on('SIGTERM', handleSignal)

// Main
const args = process.argv.slice(2)
config = buildConfig(args)

// Mostra ajuda se solicitado
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
SmartZap Stress Test

Uso:
  npx tsx tests/stress/run-stress-test.ts [opções]

Opções:
  --target=URL       URL do webhook (default: http://localhost:3000/api/webhook)
  --vus=N            Número de virtual users (sobrescreve config)
  --duration=N       Duração em segundos (sobrescreve config)
  --quick            Usa perfil de teste rápido (10 VUs, 10s)
  --aggressive       Usa perfil agressivo (até 1000 VUs)
  -h, --help         Mostra esta ajuda

Exemplos:
  # Teste local rápido
  npx tsx tests/stress/run-stress-test.ts --quick

  # Teste customizado
  npx tsx tests/stress/run-stress-test.ts --vus=50 --duration=120

  # Teste em produção
  npx tsx tests/stress/run-stress-test.ts --target=https://smartzap-eta.vercel.app/api/webhook --vus=100
`)
  process.exit(0)
}

// Executa
runStressTest().catch(error => {
  console.error('Erro fatal:', error)
  process.exit(1)
})
