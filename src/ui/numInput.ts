/** Разбор числового ввода: пусто → NaN, запятая как разделитель, мусор → NaN. */
export function parseNumInput(text: string): number {
  const cleaned = text.replace(',', '.').trim()
  if (cleaned === '') return Number.NaN
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : Number.NaN
}
