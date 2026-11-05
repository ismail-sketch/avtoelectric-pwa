import { describe, expect, it } from 'vitest'
import { noStartTree } from './noStartTree'
import { validateTree } from '../domain/treeEngine'

describe('встроенное дерево «Не заводится»', () => {
  it('проходит проверку целостности', () => {
    expect(validateTree(noStartTree)).toEqual([])
  })

  it('все четыре ветки на месте', () => {
    const root = noStartTree.nodes[noStartTree.rootId]
    expect(root.type).toBe('question')
    if (root.type === 'question') {
      expect(root.options).toHaveLength(4)
    }
  })

  it('у каждой проверки есть норма', () => {
    for (const node of Object.values(noStartTree.nodes)) {
      if (node.type === 'check') expect(node.norm).toBeTruthy()
    }
  })
})
