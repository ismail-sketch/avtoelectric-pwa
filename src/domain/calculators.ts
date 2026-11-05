// Калькуляторы. Чистые функции — легко тестировать.

export type Material = 'copper' | 'aluminum'

const RHO: Record<Material, number> = {
  copper: 0.0175, // Ом·мм²/м
  aluminum: 0.028,
}

export interface VoltageDropInput {
  currentA: number
  lengthM: number
  sectionMm2: number
  material: Material
}

export interface VoltageDropResult {
  dropV: number
  voltageAtLoad: number
  dropPercent: number
  level: 'ok' | 'warn' | 'bad'
}

/** Падение в двухпроводной линии (туда-обратно). */
export function voltageDrop(input: VoltageDropInput, supplyV = 12.6): VoltageDropResult {
  const { currentA, lengthM, sectionMm2, material } = input
  const r = (2 * RHO[material] * lengthM) / sectionMm2
  const dropV = r * currentA
  const voltageAtLoad = Math.max(0, supplyV - dropV)
  const dropPercent = supplyV > 0 ? (dropV / supplyV) * 100 : 0
  const level: VoltageDropResult['level'] =
    dropPercent <= 4 ? 'ok' : dropPercent <= 8 ? 'warn' : 'bad'
  return { dropV, voltageAtLoad, dropPercent, level }
}

/** Минимальное сечение под допустимое падение. */
export function requiredSection(input: {
  currentA: number
  lengthM: number
  material: Material
  maxDropV: number
}): number {
  const { currentA, lengthM, material, maxDropV } = input
  if (maxDropV <= 0) return Infinity
  return (2 * RHO[material] * lengthM * currentA) / maxDropV
}

// Ориентировочная длительно допустимая нагрузка для авто, медь, одиночный провод
const AMPACITY: Array<{ section: number; amps: number }> = [
  { section: 0.5, amps: 6 },
  { section: 0.75, amps: 10 },
  { section: 1, amps: 13 },
  { section: 1.5, amps: 18 },
  { section: 2.5, amps: 25 },
  { section: 4, amps: 34 },
  { section: 6, amps: 45 },
  { section: 10, amps: 62 },
  { section: 16, amps: 83 },
  { section: 25, amps: 110 },
  { section: 35, amps: 135 },
  { section: 50, amps: 165 },
]

export function recommendedSection(currentA: number): { section: number; amps: number } | null {
  return AMPACITY.find((row) => row.amps >= currentA) ?? null
}

/** Номинал предохранителя: ближайший стандартный, не выше тока провода. */
export function recommendedFuse(currentA: number, wireAmps: number): number {
  const standard = [5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150]
  const limit = Math.min(currentA * 1.25, wireAmps)
  return standard.filter((f) => f <= limit).pop() ?? standard[0]
}

export interface LeakResult {
  hoursToHalf: number
  hoursToDead: number
  level: 'ok' | 'warn' | 'bad'
}

/** Сколько простоит АКБ с таким током утечки. */
export function leakageDrain(batteryAh: number, leakMa: number): LeakResult {
  const usableAh = batteryAh * 0.5 // разряжать до 50% — безопасно для АКБ
  const hoursToHalf = leakMa > 0 ? (usableAh * 1000) / leakMa : Infinity
  const hoursToDead = leakMa > 0 ? (batteryAh * 1000 * 0.9) / leakMa : Infinity
  const level: LeakResult['level'] = leakMa <= 50 ? 'ok' : leakMa <= 80 ? 'warn' : 'bad'
  return { hoursToHalf, hoursToDead, level }
}

/** Примерный заряд АКБ по напряжению покоя (после отстоя 2–4 ч). */
export function socFromVoltage(volts: number): number {
  const table: Array<[number, number]> = [
    [12.73, 100], [12.62, 90], [12.5, 80], [12.42, 70],
    [12.32, 60], [12.2, 50], [12.06, 40], [11.9, 30],
    [11.75, 20], [11.58, 10], [11.4, 0],
  ]
  if (volts >= table[0][0]) return 100
  if (volts <= table[table.length - 1][0]) return 0
  for (let i = 0; i < table.length - 1; i++) {
    const [vHi, pHi] = table[i]
    const [vLo, pLo] = table[i + 1]
    if (volts <= vHi && volts >= vLo) {
      const t = (volts - vLo) / (vHi - vLo)
      return Math.round(pLo + t * (pHi - pLo))
    }
  }
  return 0
}

export function ohmsLaw(input: { powerW?: number; voltageV?: number; currentA?: number }): {
  powerW: number
  currentA: number
  voltageV: number
} {
  const v = input.voltageV ?? 12.6
  if (input.powerW != null && input.currentA == null) {
    return { powerW: input.powerW, currentA: input.powerW / v, voltageV: v }
  }
  if (input.currentA != null) {
    return { powerW: v * input.currentA, currentA: input.currentA, voltageV: v }
  }
  return { powerW: 0, currentA: 0, voltageV: v }
}