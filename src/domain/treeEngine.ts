import type { NodeId, RunState, StepRecord, TreeDoc, TreeNode, Verdict } from './types'

export function getNode(tree: TreeDoc, id: NodeId): TreeNode {
  const node = tree.nodes[id]
  if (!node) throw new Error(`Узел "${id}" не найден в дереве "${tree.slug}"`)
  return node
}

export function start(tree: TreeDoc): RunState {
  return { treeId: tree.id, currentId: tree.rootId, steps: [], finished: false }
}

/** Выбор варианта на узле-вопросе. */
export function pick(tree: TreeDoc, state: RunState, optionIndex: number): RunState {
  const node = getNode(tree, state.currentId)
  if (node.type !== 'question') throw new Error('pick() применим только к question')
  const option = node.options[optionIndex]
  if (!option) throw new Error(`Вариант ${optionIndex} не найден`)

  const step: StepRecord = { nodeId: node.id, nodeText: node.text, answer: option.label }
  return advance(tree, state, step, option.next)
}

/** Ответ на проверку: норма / не норма / не знаю. */
export function check(tree: TreeDoc, state: RunState, verdict: Verdict): RunState {
  const node = getNode(tree, state.currentId)
  if (node.type !== 'check') throw new Error('check() применим только к check')

  const step: StepRecord = { nodeId: node.id, nodeText: node.text, verdict }

  let next: NodeId | undefined
  if (verdict === 'ok') next = node.next
  if (verdict === 'bad') next = node.badNext
  // 'unknown' и отсутствие цели — остаёмся на узле, путь фиксируем
  if (!next) {
    return { ...state, steps: [...state.steps, step] }
  }
  return advance(tree, state, step, next)
}

function advance(tree: TreeDoc, state: RunState, step: StepRecord, nextId: NodeId): RunState {
  const steps = [...state.steps, step]
  const nextNode = getNode(tree, nextId)
  return {
    ...state,
    currentId: nextId,
    steps,
    finished: nextNode.type === 'outcome',
  }
}

export function reset(state: RunState): RunState {
  return { ...state, currentId: '', steps: [], finished: false }
}

/** Проверка целостности дерева — используется при импорте. */
export function validateTree(tree: TreeDoc): string[] {
  const errors: string[] = []
  const ids = Object.keys(tree.nodes)

  if (!ids.length) errors.push('Дерево пустое')
  if (!tree.nodes[tree.rootId]) errors.push(`Стартовый узел "${tree.rootId}" не существует`)

  const reachable = new Set<NodeId>([tree.rootId])
  const links: Array<[NodeId, NodeId]> = []

  for (const id of ids) {
    const node = tree.nodes[id]
    if (node.id !== id) errors.push(`id узла "${id}" не совпадает с ключом "${node.id}"`)

    if (node.type === 'question') {
      if (!node.options?.length) errors.push(`Вопрос "${id}" без вариантов`)
      for (const o of node.options ?? []) {
        if (!tree.nodes[o.next]) errors.push(`Вопрос "${id}": вариант "${o.label}" ведёт в несуществующий "${o.next}"`)
        else links.push([id, o.next])
      }
    }
    if (node.type === 'check') {
      if (node.next && !tree.nodes[node.next]) errors.push(`Проверка "${id}": next "${node.next}" не существует`)
      if (node.badNext && !tree.nodes[node.badNext]) errors.push(`Проверка "${id}": badNext "${node.badNext}" не существует`)
      if (!node.next) errors.push(`Проверка "${id}": не задан next (куда идти при норме)`)
      if (node.next) links.push([id, node.next])
      if (node.badNext) links.push([id, node.badNext])
    }
  }

  // достижимость
  const queue = [tree.rootId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const [from, to] of links) {
      if (from === cur && !reachable.has(to)) {
        reachable.add(to)
        queue.push(to)
      }
    }
  }
  for (const id of ids) {
    if (!reachable.has(id)) errors.push(`Узел "${id}" недостижим из старта`)
  }

  return errors
}
