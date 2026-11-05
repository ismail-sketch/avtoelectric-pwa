import { describe, expect, it } from 'vitest'
import { voltageDrop, requiredSection, recommendedSection, recommendedFuse, leakageDrain, socFromVoltage } from './calculators'

describe('voltageDrop', () => {
  it('падение на меди: 8 А, 4 м, 1.5 мм²', () => {
    const r = voltageDrop({ currentA: 8, lengthM: 4, sectionMm2: 1.5, material: 'copper' })
    // R = 2*0.0175*4/1.5 ≈ 0.0933 Ом, drop ≈ 0.747 В
    expect(r.dropV).toBeCloseTo(0.747, 2)
    expect(r.level).toBe('warn')
  })

  it('толстый провод — норма', () => {
    const r = voltageDrop({ currentA: 5, lengthM: 2, sectionMm2: 2.5, material: 'copper' })
    expect(r.level).toBe('ok')
  })

  it('тонкий длинный провод — плохо', () => {
    const r = voltageDrop({ currentA: 10, lengthM: 10, sectionMm2: 0.5, material: 'copper' })
    expect(r.level).toBe('bad')
  })
})

describe('requiredSection', () => {
  it('сечение под 0.5 В: 8 А, 4 м, медь', () => {
    const s = requiredSection({ currentA: 8, lengthM: 4, material: 'copper', maxDropV: 0.5 })
    expect(s).toBeCloseTo(2.24, 2) // 2*0.0175*4*8/0.5
  })
})

describe('recommendedSection', () => {
  it('25 А → 2.5 мм² (кратковременно) или 4 мм² по запасу', () => {
    const r = recommendedSection(24)
    expect(r?.section).toBe(2.5)
  })
})

describe('recommendedFuse', () => {
  it('ток 8 А, провод 18 А → 10 А', () => {
    expect(recommendedFuse(8, 18)).toBe(10)
  })
  it('ограничивается током провода', () => {
    expect(recommendedFuse(20, 18)).toBe(15)
  })
})

describe('leakageDrain', () => {
  it('60 Ah, 40 мА — норма, стоит больше месяца', () => {
    const r = leakageDrain(60, 40)
    expect(r.level).toBe('ok')
    expect(r.hoursToHalf).toBe(750) // 30 Ah * 1000 / 40
  })
  it('150 мА — плохо', () => {
    expect(leakageDrain(60, 150).level).toBe('bad')
  })
})

describe('socFromVoltage', () => {
  it('12.6 В ≈ 90-100%', () => {
    expect(socFromVoltage(12.65)).toBeGreaterThanOrEqual(90)
  })
  it('12.2 В ≈ 50%', () => {
    expect(socFromVoltage(12.2)).toBe(50)
  })
  it('11.3 В → 0', () => {
    expect(socFromVoltage(11.3)).toBe(0)
  })
})