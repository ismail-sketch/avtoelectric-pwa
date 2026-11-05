import { describe, expect, it } from 'vitest'
import {
  voltageDrop,
  requiredSection,
  recommendedSection,
  recommendedFuse,
  leakageDrain,
  socFromVoltage,
  standardSection,
  ampsForSection,
  chooseWire,
} from './calculators'

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

  it('норма по цепи освещения 0,3 В строже, чем 4 %', () => {
    // 0,4 В — это 3,2 % (прошло бы по процентам), но больше 0,3 В
    const r = voltageDrop(
      { currentA: 8, lengthM: 2, sectionMm2: 1.5, material: 'copper', allowedDropV: 0.3 },
    )
    expect(r.dropV).toBeCloseTo(0.373, 2)
    expect(r.level).toBe('warn')
  })

  it('без allowedDropV норма — 4 % от сети', () => {
    const r = voltageDrop({ currentA: 8, lengthM: 4, sectionMm2: 1.5, material: 'copper' })
    expect(r.allowedDropV).toBeCloseTo(0.504, 3)
  })
})

describe('requiredSection', () => {
  it('сечение под 0.5 В: 8 А, 4 м, медь', () => {
    const s = requiredSection({ currentA: 8, lengthM: 4, material: 'copper', maxDropV: 0.5 })
    expect(s).toBeCloseTo(2.24, 2) // 2*0.0175*4*8/0.5
  })
})

describe('standardSection', () => {
  it('2,24 → 2,5 мм²', () => {
    expect(standardSection(2.24)).toBe(2.5)
  })
  it('ровно 2,5 → 2,5 мм²', () => {
    expect(standardSection(2.5)).toBe(2.5)
  })
  it('больше 50 → null', () => {
    expect(standardSection(60)).toBeNull()
  })
})

describe('ampsForSection', () => {
  it('2,5 мм² → 25 А', () => {
    expect(ampsForSection(2.5)).toBe(25)
  })
})

describe('recommendedSection', () => {
  it('24 А → 2.5 мм²', () => {
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
  it('слаботочка 2 А → 2 А, а не 5 А', () => {
    expect(recommendedFuse(2, 6)).toBe(2)
  })
  it('провод не держит даже 1 А → null', () => {
    expect(recommendedFuse(0.5, 0.8)).toBeNull()
  })
})

describe('chooseWire', () => {
  it('длинная линия: решает падение, а не нагрев', () => {
    // 20 А, 8 м, медь, ≤0,5 В → 2*0.0175*8*20/0.5 = 11,2 мм² → 16 мм²
    const w = chooseWire({ currentA: 20, lengthM: 8, material: 'copper', maxDropV: 0.5 })
    expect(w.byDrop).toBeCloseTo(11.2, 1)
    expect(w.section).toBe(16)
    expect(w.fuse).toBe(25)
  })
  it('короткая линия: решает нагрев', () => {
    const w = chooseWire({ currentA: 40, lengthM: 1, material: 'copper', maxDropV: 0.5 })
    expect(w.section).toBe(6)
    expect(w.fuse).toBe(40)
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