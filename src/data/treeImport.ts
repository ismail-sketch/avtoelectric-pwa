import Papa from 'papaparse'
import type { NodeId, TreeDoc, TreeNode, TreeOption } from '../domain/types'
import { validateTree } from '../domain/treeEngine'

// Импорт дерева из таблицы. Колонки:
// id, type, text, options, tool, points, norm, ifBad, stop, next, badNext, note
// options: "Да=>n1; Нет=>n2"
// root — отдельная строка-служебная с id = "root"? Нет: стартовый узел = id первой строки.

const REQUIRED = ['id', 'type', 'text'] as const

export function parseOptions(raw?: string): TreeOption[] {
  if (!raw?.trim()) return []
  return raw
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [label, next] = chunk.split('=>').map((s) => s.trim())
      if (!label || !next) throw new Error(`Не разобрал вариант: "${chunk}". Нужно "Текст=>id"`)
      return { label, next }
    })
}

export function treeFromCsv(csv: string, meta: { slug: string; title: string; rootId?: NodeId }): TreeDoc {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map((e) => `строка ${e.row}: ${e.message}`).join('\n'))
  }

  const rows = parsed.data
  if (!rows.length) throw new Error('Файл пустой')

  const header = parsed.meta.fields ?? []
  const missing = REQUIRED.filter((c) => !header.includes(c))
  if (missing.length) throw new Error(`Нет колонок: ${missing.join(', ')}`)

  const nodes: Record<string, TreeNode> = {}

  for (const [i, row] of rows.entries()) {
    const id = row.id?.trim()
    if (!id) throw new Error(`Строка ${i + 2}: пустой id`)
    if (nodes[id]) throw new Error(`Строка ${i + 2}: дубль id "${id}"`)
    const type = row.type?.trim()
    const text = row.text?.trim()
    if (!text) throw new Error(`Строка ${i + 2}: пустой text`)

    if (type === 'question') {
      nodes[id] = {
        id,
        type,
        text,
        note: row.note || undefined,
        stop: row.stop || undefined,
        options: parseOptions(row.options),
      }
    } else if (type === 'check') {
      nodes[id] = {
        id,
        type,
        text,
        tool: row.tool || undefined,
        points: row.points || undefined,
        norm: row.norm || undefined,
        ifBad: row.ifbad || undefined,
        next: row.next || undefined,
        badNext: row.badnext || undefined,
        stop: row.stop || undefined,
        note: row.note || undefined,
      }
    } else if (type === 'outcome') {
      nodes[id] = { id, type, text, note: row.note || undefined }
    } else {
      throw new Error(`Строка ${i + 2}: неизвестный type "${type}" (нужно question|check|outcome)`)
    }
  }

  const tree: TreeDoc = {
    id: crypto.randomUUID(),
    slug: meta.slug,
    title: meta.title,
    version: 1,
    rootId: meta.rootId ?? rows[0].id.trim(),
    nodes,
    updatedAt: new Date().toISOString(),
  }

  const errors = validateTree(tree)
  if (errors.length) throw new Error('Дерево не прошло проверку:\n' + errors.join('\n'))
  return tree
}

export const CSV_TEMPLATE = `id,type,text,options,tool,points,norm,ifBad,stop,next,badNext,note
q1,question,Стартер крутит?,Да=>c1; Нет=>c2,,,,,,,,
c1,check,Напряжение АКБ в покое,,мультиметр,клеммы,12.6-12.8 В,зарядить,,o1,,отстой 2-4 ч
c2,check,Масса двигателя,,мультиметр,блок-минус,<=0.2 В,чистить,,o1,,
o1,outcome,Готово,,,,,,,,,
`
