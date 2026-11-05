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
  // Разделитель вариантов — ';' или '|'. Внутри варианта — '=>' или '→'.
  return raw
    .split(/[;|]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [label, next] = chunk.split(/=>|→/).map((s) => s.trim())
      if (!label || !next) throw new Error(`Не разобрал вариант: "${chunk}". Нужно "Текст=>id"`)
      return { label, next }
    })
}

/** Excel в русской Windows сохраняет CSV в windows-1251. Определяем кодировку сами. */
export function decodeCsv(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  if (!utf8.includes('\uFFFD')) return utf8.replace(/^\uFEFF/, '')
  try {
    return new TextDecoder('windows-1251').decode(bytes)
  } catch {
    return utf8
  }
}

export function treeFromCsv(csv: string, meta: { slug: string; title: string; rootId?: NodeId }): TreeDoc {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  // TooFewFields — это просто пустые необязательные колонки в конце строки, это норма.
  // TooManyFields — настоящая ошибка: скорее всего запятая в тексте без кавычек.
  const fatal = parsed.errors.filter((e) => e.code !== 'TooFewFields')
  if (fatal.length) {
    throw new Error(
      fatal
        .map((e) => `строка ${(e.row ?? 0) + 2}: ${e.message}`)
        .join('\n'),
    )
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
q1,question,Что не работает?,Ближний свет=>q2; Габариты=>q2; Поворотники=>q2,,,,,,,,
q2,question,Обе стороны или одна?,Обе=>c1; Одна=>c2,,,,,,,,
c1,check,Предохранитель цепи,,мультиметр или глаза,блок предохранителей,целый,заменить предохранитель,,c2,o2,
c2,check,Напряжение на разъёме лампы при включении,,мультиметр DC,разъём лампы,не ниже 12 В,искать разрыв по цепи,,c3,o2,
c3,check,Масса на корпусе фары,,мультиметр DC,кузов и минус АКБ,"не более 0,2 В",чистить точку массы,,o1,o2,
o1,outcome,Цепь исправна — смотреть лампу и патрон,,,,,,,,,Проверить лампу на просвет и контакты патрона
o2,outcome,Разрыв в цепи — звонить по схеме от предохранителя к потребителю,,,,,,,,,"Массу и разъёмы проверять до замены деталей"
`
