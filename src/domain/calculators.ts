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
  /** Допустимое падение, В. Если не задано — 4 % от напряжения сети. */
  allowedDropV?: number
}

export interface VoltageDropResult {
  dropV: number
  voltageAtLoad: number
  dropPercent: number
  allowedDropV: number
  level: 'ok' | 'warn' | 'bad'
}

/**
 * Падение в двухпроводной линии (туда-обратно).
 * Порог задаётся в вольтах (по типу цепи), а не в процентах:
 * для силовых цепей и освещения нормы разные.
 */
export function voltageDrop(input: VoltageDropInput, supplyV = 12.6): VoltageDropResult {
  const { currentA, lengthM, sectionMm2, material } = input
  const r = (2 * RHO[material] * lengthM) / sectionMm2
  const dropV = r * currentA
  const voltageAtLoad = Math.max(0, supplyV - dropV)
  const dropPercent = supplyV > 0 ? (dropV / supplyV) * 100 : 0
  const allowedDropV =
    input.allowedDropV != null && input.allowedDropV > 0 ? input.allowedDropV : supplyV * 0.04
  // ok — в пределах нормы, warn — до двух норм, bad — больше.
  const ratio = allowedDropV > 0 ? dropV / allowedDropV : 0
  const level: VoltageDropResult['level'] = ratio <= 1 ? 'ok' : ratio <= 2 ? 'warn' : 'bad'
  return { dropV, voltageAtLoad, dropPercent, allowedDropV, level }
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

/** Стандартный ряд автомобильных проводов, мм². */
export const STANDARD_SECTIONS = [0.35, 0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50]

/** Ближайшее стандартное сечение не меньше расчётного. */
export function standardSection(sectionMm2: number): number | null {
  return STANDARD_SECTIONS.find((s) => s >= sectionMm2 - 1e-9) ?? null
}

/** Длительно допустимый ток по таблице нагрева (медь, одиночный провод). */
export function ampsForSection(sectionMm2: number): number {
  if (sectionMm2 <= 0) return 0
  const first = AMPACITY[0]
  if (sectionMm2 <= first.section) return first.amps
  for (let i = 0; i < AMPACITY.length - 1; i++) {
    const lo = AMPACITY[i]
    const hi = AMPACITY[i + 1]
    if (sectionMm2 <= hi.section) {
      const t = (sectionMm2 - lo.section) / (hi.section - lo.section)
      return lo.amps + t * (hi.amps - lo.amps)
    }
  }
  return AMPACITY[AMPACITY.length - 1].amps
}

export function recommendedSection(currentA: number): { section: number; amps: number } | null {
  return AMPACITY.find((row) => row.amps >= currentA) ?? null
}

/**
 * Номинал предохранителя: ближайший стандартный, не выше тока провода.
 * Возвращает null, если провод не держит даже минимальный номинал.
 */
export function recommendedFuse(currentA: number, wireAmps: number): number | null {
  const standard = [1, 2, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150]
  const limit = Math.min(currentA * 1.25, wireAmps)
  return standard.filter((f) => f <= limit).pop() ?? null
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

export interface WireChoice {
  /** Сечение по допустимому падению, мм². */
  byDrop: number
  /** Ближайшее стандартное сечение не меньше byDrop (null — больше 50 мм²). */
  dropStandard: number | null
  /** Минимальное стандартное сечение по нагреву (null — ток выше таблицы). */
  heatStandard: number | null
  /** Итоговое сечение: максимум из падения и нагрева, округлённый вверх. */
  section: number | null
  /** Предохранитель под итоговое сечение (null — провод не держит). */
  fuse: number | null
}

/**
 * Подбор провода: сначала по падению напряжения (главное для авто),
 * затем проверка по нагреву, затем округление до стандартного ряда.
 */
export function chooseWire(input: {
  currentA: number
  lengthM: number
  material: Material
  maxDropV: number
}): WireChoice {
  const byDrop = requiredSection(input)
  const dropStandard = standardSection(byDrop)
  const heat = recommendedSection(input.currentA)
  const heatStandard = heat?.section ?? null
  const base = Math.max(dropStandard ?? 0, heatStandard ?? 0)
  const section = base > 0 ? standardSection(base) : null
  const wireAmps = section != null ? ampsForSection(section) : 0
  const fuse = section != null ? recommendedFuse(input.currentA, wireAmps) : null
  return { byDrop, dropStandard, heatStandard, section, fuse }
}