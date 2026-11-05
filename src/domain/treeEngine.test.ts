import { describe, expect, it } from 'vitest'
import { validateTree, start, pick, check } from './treeEngine'
import type { TreeDoc } from './types'

const tree: TreeDoc = {
  id: 't1',
  slug: 'test',
  title: 'Тест',
  version: 1,
  rootId: 'q1',
  updatedAt: new Date().toISOString(),
  nodes: {
    q1: { id: 'q1', type: 'question', text: 'Стартер крутит?', options: [
      { label: 'Да', next: 'c1' },
      { label: 'Нет', next: 'c2' },
    ]},
    c1: { id: 'c1', type: 'check', text: 'Искра есть?', next: 'o1', badNext: 'c2' },
    c2: { id: 'c2', type: 'check', text: 'Масса?', next: 'o1' },
    o1: { id: 'o1', type: 'outcome', text: 'Готово' },
  },
}

describe('validateTree', () => {
  it('корректное дерево без ошибок', () => {
    expect(validateTree(tree)).toEqual([])
  })
  it('ловит битую ссылку', () => {
    const bad = structuredClone(tree)
    bad.nodes.q1 = { ...bad.nodes.q1, options: [{ label: 'Да', next: 'nope' }] } as never
    expect(validateTree(bad).join()).toContain('несуществующий')
  })
  it('ловит недостижимый узел', () => {
    const bad = structuredClone(tree)
    bad.nodes.orphan = { id: 'orphan', type: 'outcome', text: 'сирота' }
    expect(validateTree(bad).join()).toContain('недостижим')
  })
})

describe('прохождение', () => {
  it('вопрос → проверка → финал', () => {
    let s = start(tree)
    s = pick(tree, s, 1) // Нет → c2
    expect(s.currentId).toBe('c2')
    s = check(tree, s, 'ok') // → o1
    expect(s.currentId).toBe('o1')
    expect(s.finished).toBe(true)
    expect(s.steps).toHaveLength(2)
  })

  it('не норма ведёт по badNext', () => {
    let s = start(tree)
    s = pick(tree, s, 0) // Да → c1
    s = check(tree, s, 'bad') // → c2
    expect(s.currentId).toBe('c2')
  })

  it('не знаю — остаёмся на узле, но шаг записан', () => {
    let s = start(tree)
    s = pick(tree, s, 0)
    s = check(tree, s, 'unknown')
    expect(s.currentId).toBe('c1')
    expect(s.steps.at(-1)?.verdict).toBe('unknown')
  })
})