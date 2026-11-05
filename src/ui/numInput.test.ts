import { describe, expect, it } from 'vitest'
import { parseNumInput } from './numInput'

describe('parseNumInput', () => {
  it('обычное число', () => {
    expect(parseNumInput('12.5')).toBe(12.5)
  })
  it('запятая как разделитель', () => {
    expect(parseNumInput('12,5')).toBe(12.5)
  })
  it('пустая строка → NaN (это и есть фикс бага с нулём)', () => {
    expect(Number.isNaN(parseNumInput(''))).toBe(true)
  })
  it('только пробелы → NaN', () => {
    expect(Number.isNaN(parseNumInput('   '))).toBe(true)
  })
  it('минус в процессе ввода → NaN, не 0', () => {
    expect(Number.isNaN(parseNumInput('-'))).toBe(true)
  })
  it('мусор → NaN', () => {
    expect(Number.isNaN(parseNumInput('abc'))).toBe(true)
  })
  it('ноль остаётся нулём', () => {
    expect(parseNumInput('0')).toBe(0)
  })
})
