/**
 * Configuração do Stress Test
 *
 * Define parâmetros de carga, fases de teste e configurações de métricas.
 */

export interface StressTestConfig {
  /** URL alvo do webhook */
  targetUrl: string

  /** Fases de teste */
  phases: TestPhase[]

  /** Timeout por requisição (ms) */
  requestTimeout: number

  /** Intervalo entre coleta de métricas (ms) */
  metricsInterval: number

  /** Diretório para relatórios */
  reportsDir: string
}

export interface TestPhase {
  /** Nome da fase */
  name: string

  /** Duração em segundos */
  duration: number

  /** Número de virtual users (concorrência) */
  vus: number

  /** Requisições por segundo por VU (0 = sem limite) */
  rps: number
}

/**
 * Configuração padrão para teste local
 */
export const DEFAULT_CONFIG: StressTestConfig = {
  targetUrl: 'http://localhost:3000/api/webhook',
  requestTimeout: 30000, // 30s
  metricsInterval: 1000, // 1s
  reportsDir: './tests/stress/reports',
  phases: [
    { name: 'warmup', duration: 10, vus: 5, rps: 0 },
    { name: 'ramp-up', duration: 30, vus: 50, rps: 0 },
    { name: 'peak', duration: 60, vus: 100, rps: 0 },
    { name: 'cooldown', duration: 10, vus: 10, rps: 0 },
  ],
}

/**
 * Configuração para teste agressivo (produção)
 */
export const AGGRESSIVE_CONFIG: StressTestConfig = {
  ...DEFAULT_CONFIG,
  phases: [
    { name: 'warmup', duration: 10, vus: 10, rps: 0 },
    { name: 'ramp-1', duration: 20, vus: 100, rps: 0 },
    { name: 'ramp-2', duration: 20, vus: 500, rps: 0 },
    { name: 'peak', duration: 60, vus: 1000, rps: 0 },
    { name: 'sustained', duration: 120, vus: 1000, rps: 0 },
    { name: 'cooldown', duration: 20, vus: 50, rps: 0 },
  ],
}

/**
 * Configuração mínima para testes rápidos
 */
export const QUICK_CONFIG: StressTestConfig = {
  ...DEFAULT_CONFIG,
  phases: [
    { name: 'quick-test', duration: 10, vus: 10, rps: 0 },
  ],
}

/**
 * Thresholds (metas de performance)
 */
export const THRESHOLDS = {
  /** p50 Response Time máximo aceitável (ms) */
  p50ResponseTime: 500,

  /** p95 Response Time máximo aceitável (ms) */
  p95ResponseTime: 2000,

  /** p99 Response Time máximo aceitável (ms) */
  p99ResponseTime: 5000,

  /** Taxa de erro máxima aceitável (0-1) */
  maxErrorRate: 0.01,

  /** Throughput mínimo esperado (req/s) */
  minThroughput: 100,
}

/**
 * Pool de números de telefone únicos
 * Gera 1000 números no formato +5511900XXXXXX
 */
export function generatePhonePool(count: number = 1000): string[] {
  const phones: string[] = []
  for (let i = 0; i < count; i++) {
    // Gera números de 55119000XXXXX a 55119009XXXXX
    const suffix = String(i).padStart(6, '0')
    phones.push(`5511900${suffix}`)
  }
  return phones
}

/**
 * Parse argumentos CLI
 */
export function parseCliArgs(args: string[]): Partial<StressTestConfig> & {
  profile?: 'default' | 'aggressive' | 'quick'
} {
  const config: Partial<StressTestConfig> & { profile?: 'default' | 'aggressive' | 'quick' } = {}

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      config.targetUrl = arg.replace('--target=', '')
    } else if (arg.startsWith('--vus=')) {
      const vus = parseInt(arg.replace('--vus=', ''), 10)
      config.phases = [{ name: 'custom', duration: 60, vus, rps: 0 }]
    } else if (arg.startsWith('--duration=')) {
      const duration = parseInt(arg.replace('--duration=', ''), 10)
      if (config.phases?.[0]) {
        config.phases[0].duration = duration
      }
    } else if (arg === '--quick') {
      config.profile = 'quick'
    } else if (arg === '--aggressive') {
      config.profile = 'aggressive'
    }
  }

  return config
}

/**
 * Mescla configuração CLI com config base
 */
export function buildConfig(cliArgs: string[]): StressTestConfig {
  const parsed = parseCliArgs(cliArgs)

  let baseConfig: StressTestConfig
  switch (parsed.profile) {
    case 'aggressive':
      baseConfig = AGGRESSIVE_CONFIG
      break
    case 'quick':
      baseConfig = QUICK_CONFIG
      break
    default:
      baseConfig = DEFAULT_CONFIG
  }

  return {
    ...baseConfig,
    ...parsed,
    phases: parsed.phases ?? baseConfig.phases,
  }
}
