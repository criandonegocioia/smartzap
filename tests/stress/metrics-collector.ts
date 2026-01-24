/**
 * Coletor de Métricas do Stress Test
 *
 * Coleta, agrega e exporta métricas de performance.
 * Calcula percentis, throughput e taxas de erro.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { THRESHOLDS } from './config'

export interface RequestMetric {
  /** Timestamp de início */
  startTime: number

  /** Duração em ms */
  duration: number

  /** Status HTTP */
  status: number

  /** Se foi erro */
  isError: boolean

  /** Código de erro (se aplicável) */
  errorCode?: string

  /** Mensagem de erro (se aplicável) */
  errorMessage?: string

  /** Fase do teste */
  phase: string
}

export interface AggregatedMetrics {
  /** Total de requisições */
  totalRequests: number

  /** Requisições com sucesso */
  successCount: number

  /** Requisições com erro */
  errorCount: number

  /** Taxa de erro (0-1) */
  errorRate: number

  /** Latências em ms */
  latency: {
    min: number
    max: number
    avg: number
    p50: number
    p95: number
    p99: number
  }

  /** Throughput */
  throughput: {
    requestsPerSecond: number
  }

  /** Erros agrupados por código */
  errorsByCode: Record<string, number>

  /** Métricas por fase */
  byPhase: Record<string, PhaseMetrics>

  /** Timeline para gráficos (por segundo) */
  timeline: TimelinePoint[]
}

export interface PhaseMetrics {
  totalRequests: number
  successCount: number
  errorCount: number
  avgLatency: number
  p95Latency: number
}

export interface TimelinePoint {
  timestamp: number
  requestsPerSecond: number
  avgLatency: number
  errorRate: number
}

export class MetricsCollector {
  private metrics: RequestMetric[] = []
  private startTime: number = 0
  private currentPhase: string = ''
  private timelineBuffer: Map<number, { count: number; totalLatency: number; errors: number }> = new Map()

  /**
   * Inicia coleta de métricas
   */
  start(): void {
    this.startTime = Date.now()
    this.metrics = []
    this.timelineBuffer.clear()
  }

  /**
   * Define fase atual
   */
  setPhase(phase: string): void {
    this.currentPhase = phase
  }

  /**
   * Registra uma requisição
   */
  record(metric: Omit<RequestMetric, 'phase'>): void {
    this.metrics.push({
      ...metric,
      phase: this.currentPhase,
    })

    // Agrupa por segundo para timeline
    const second = Math.floor(metric.startTime / 1000)
    const existing = this.timelineBuffer.get(second) || { count: 0, totalLatency: 0, errors: 0 }
    this.timelineBuffer.set(second, {
      count: existing.count + 1,
      totalLatency: existing.totalLatency + metric.duration,
      errors: existing.errors + (metric.isError ? 1 : 0),
    })
  }

  /**
   * Calcula percentil de um array ordenado
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  /**
   * Agrega todas as métricas
   */
  aggregate(): AggregatedMetrics {
    const totalRequests = this.metrics.length
    const successCount = this.metrics.filter(m => !m.isError).length
    const errorCount = this.metrics.filter(m => m.isError).length
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0

    // Latências
    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b)
    const avgLatency = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    // Erros por código
    const errorsByCode: Record<string, number> = {}
    for (const metric of this.metrics.filter(m => m.isError)) {
      const code = metric.errorCode || `HTTP_${metric.status}`
      errorsByCode[code] = (errorsByCode[code] || 0) + 1
    }

    // Métricas por fase
    const byPhase: Record<string, PhaseMetrics> = {}
    const phases = Array.from(new Set(this.metrics.map(m => m.phase)))
    for (const phase of phases) {
      const phaseMetrics = this.metrics.filter(m => m.phase === phase)
      const phaseDurations = phaseMetrics.map(m => m.duration).sort((a, b) => a - b)
      byPhase[phase] = {
        totalRequests: phaseMetrics.length,
        successCount: phaseMetrics.filter(m => !m.isError).length,
        errorCount: phaseMetrics.filter(m => m.isError).length,
        avgLatency: phaseDurations.length > 0
          ? phaseDurations.reduce((a, b) => a + b, 0) / phaseDurations.length
          : 0,
        p95Latency: this.percentile(phaseDurations, 95),
      }
    }

    // Timeline
    const timeline: TimelinePoint[] = []
    for (const [timestamp, data] of Array.from(this.timelineBuffer.entries())) {
      timeline.push({
        timestamp,
        requestsPerSecond: data.count,
        avgLatency: data.count > 0 ? data.totalLatency / data.count : 0,
        errorRate: data.count > 0 ? data.errors / data.count : 0,
      })
    }
    timeline.sort((a, b) => a.timestamp - b.timestamp)

    // Throughput
    const testDuration = (Date.now() - this.startTime) / 1000
    const requestsPerSecond = testDuration > 0 ? totalRequests / testDuration : 0

    return {
      totalRequests,
      successCount,
      errorCount,
      errorRate,
      latency: {
        min: durations.length > 0 ? durations[0] : 0,
        max: durations.length > 0 ? durations[durations.length - 1] : 0,
        avg: avgLatency,
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      },
      throughput: {
        requestsPerSecond,
      },
      errorsByCode,
      byPhase,
      timeline,
    }
  }

  /**
   * Verifica se passou nos thresholds
   */
  checkThresholds(metrics: AggregatedMetrics): { passed: boolean; failures: string[] } {
    const failures: string[] = []

    if (metrics.latency.p50 > THRESHOLDS.p50ResponseTime) {
      failures.push(`p50 latency ${metrics.latency.p50.toFixed(0)}ms > ${THRESHOLDS.p50ResponseTime}ms`)
    }

    if (metrics.latency.p95 > THRESHOLDS.p95ResponseTime) {
      failures.push(`p95 latency ${metrics.latency.p95.toFixed(0)}ms > ${THRESHOLDS.p95ResponseTime}ms`)
    }

    if (metrics.latency.p99 > THRESHOLDS.p99ResponseTime) {
      failures.push(`p99 latency ${metrics.latency.p99.toFixed(0)}ms > ${THRESHOLDS.p99ResponseTime}ms`)
    }

    if (metrics.errorRate > THRESHOLDS.maxErrorRate) {
      failures.push(`error rate ${(metrics.errorRate * 100).toFixed(2)}% > ${(THRESHOLDS.maxErrorRate * 100).toFixed(2)}%`)
    }

    if (metrics.throughput.requestsPerSecond < THRESHOLDS.minThroughput && metrics.totalRequests > 100) {
      failures.push(`throughput ${metrics.throughput.requestsPerSecond.toFixed(1)} req/s < ${THRESHOLDS.minThroughput} req/s`)
    }

    return { passed: failures.length === 0, failures }
  }

  /**
   * Gera relatório em texto
   */
  generateReport(metrics: AggregatedMetrics): string {
    const { passed, failures } = this.checkThresholds(metrics)

    let report = `
╔══════════════════════════════════════════════════════════════════╗
║                    STRESS TEST REPORT                            ║
╠══════════════════════════════════════════════════════════════════╣
║  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}                                               ║
╠══════════════════════════════════════════════════════════════════╣

📊 RESUMO
────────────────────────────────────────────────────────────────────
  Total de requisições:  ${metrics.totalRequests.toLocaleString()}
  Sucesso:               ${metrics.successCount.toLocaleString()} (${((1 - metrics.errorRate) * 100).toFixed(2)}%)
  Erros:                 ${metrics.errorCount.toLocaleString()} (${(metrics.errorRate * 100).toFixed(2)}%)
  Throughput:            ${metrics.throughput.requestsPerSecond.toFixed(1)} req/s

⏱️  LATÊNCIA
────────────────────────────────────────────────────────────────────
  Mínimo:   ${metrics.latency.min.toFixed(0)}ms
  Máximo:   ${metrics.latency.max.toFixed(0)}ms
  Média:    ${metrics.latency.avg.toFixed(0)}ms
  p50:      ${metrics.latency.p50.toFixed(0)}ms ${metrics.latency.p50 > THRESHOLDS.p50ResponseTime ? '⚠️' : '✓'}
  p95:      ${metrics.latency.p95.toFixed(0)}ms ${metrics.latency.p95 > THRESHOLDS.p95ResponseTime ? '⚠️' : '✓'}
  p99:      ${metrics.latency.p99.toFixed(0)}ms ${metrics.latency.p99 > THRESHOLDS.p99ResponseTime ? '⚠️' : '✓'}

📈 POR FASE
────────────────────────────────────────────────────────────────────`

    for (const [phase, pm] of Object.entries(metrics.byPhase)) {
      report += `
  ${phase}:
    Requisições: ${pm.totalRequests}
    Sucesso:     ${pm.successCount} | Erros: ${pm.errorCount}
    Avg Latency: ${pm.avgLatency.toFixed(0)}ms | p95: ${pm.p95Latency.toFixed(0)}ms`
    }

    if (Object.keys(metrics.errorsByCode).length > 0) {
      report += `

❌ ERROS POR CÓDIGO
────────────────────────────────────────────────────────────────────`
      for (const [code, count] of Object.entries(metrics.errorsByCode)) {
        report += `
  ${code}: ${count}`
      }
    }

    if (failures.length > 0) {
      report += `

⚠️  THRESHOLDS VIOLADOS
────────────────────────────────────────────────────────────────────`
      for (const failure of failures) {
        report += `
  • ${failure}`
      }
    }

    report += `

════════════════════════════════════════════════════════════════════
`

    return report
  }

  /**
   * Exporta métricas para JSON
   */
  async exportJson(metrics: AggregatedMetrics, outputDir: string): Promise<string> {
    await mkdir(outputDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `stress-test-${timestamp}.json`
    const filepath = join(outputDir, filename)

    await writeFile(filepath, JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics,
      thresholds: THRESHOLDS,
      thresholdCheck: this.checkThresholds(metrics),
    }, null, 2))

    return filepath
  }

  /**
   * Exporta métricas para CSV (timeline)
   */
  async exportCsv(metrics: AggregatedMetrics, outputDir: string): Promise<string> {
    await mkdir(outputDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `stress-test-timeline-${timestamp}.csv`
    const filepath = join(outputDir, filename)

    const csv = [
      'timestamp,requests_per_second,avg_latency_ms,error_rate',
      ...metrics.timeline.map(t =>
        `${t.timestamp},${t.requestsPerSecond},${t.avgLatency.toFixed(2)},${t.errorRate.toFixed(4)}`
      ),
    ].join('\n')

    await writeFile(filepath, csv)

    return filepath
  }

  /**
   * Exporta relatório completo em texto
   */
  async exportReport(metrics: AggregatedMetrics, outputDir: string): Promise<string> {
    await mkdir(outputDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `stress-test-report-${timestamp}.txt`
    const filepath = join(outputDir, filename)

    await writeFile(filepath, this.generateReport(metrics))

    return filepath
  }
}
