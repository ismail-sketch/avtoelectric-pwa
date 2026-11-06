import { db, type TreeRow } from './db'
import { noStartTree } from '../content/noStartTree'
import type { TreeDoc } from '../domain/types'

// Репозиторий контента. UI не знает про Dexie — только про эти функции.

export async function ensureSeed(): Promise<void> {
  // Считаем только видимые деревья: если все удалены, встроенное должно вернуться.
  const visible = await db.trees.filter((r) => !r.deletedAt).count()
  if (visible > 0) return
  await restoreSeedTree()
}

/** Вернуть встроенное дерево «Не заводится», даже если его удалили. */
export async function restoreSeedTree(): Promise<void> {
  const existing = await db.trees.where('slug').equals(noStartTree.slug).first()
  if (existing) {
    await db.trees.where('id').equals(existing.id).modify((row) => {
      delete row.deletedAt
    })
    return
  }
  await db.trees.put({
    id: noStartTree.id,
    slug: noStartTree.slug,
    title: noStartTree.title,
    version: noStartTree.version,
    doc: noStartTree,
    updatedAt: noStartTree.updatedAt,
  })
}

export async function listTrees(): Promise<TreeRow[]> {
  const rows = await db.trees.filter((r) => !r.deletedAt).toArray()
  return rows.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

export async function getTreeBySlug(slug: string): Promise<TreeDoc | null> {
  const row = await db.trees.where('slug').equals(slug).first()
  if (!row || row.deletedAt) return null
  return row.doc
}

/**
 * Сохранение дерева.
 * Повторный импорт того же slug обновляет существующее дерево (версия +1),
 * а не плодит дубликаты. id сохраняется, чтобы ссылки не рвались.
 */
export async function saveTree(doc: TreeDoc, { bumpIfExists = true } = {}): Promise<TreeDoc> {
  const existing = await db.trees.where('slug').equals(doc.slug).first()

  const finalDoc: TreeDoc = existing
    ? {
        ...doc,
        id: existing.id,
        version: bumpIfExists ? existing.doc.version + 1 : doc.version,
        updatedAt: new Date().toISOString(),
      }
    : doc

  const row: TreeRow = {
    id: finalDoc.id,
    slug: finalDoc.slug,
    title: finalDoc.title,
    version: finalDoc.version,
    doc: finalDoc,
    updatedAt: finalDoc.updatedAt,
  }
  await db.trees.put(row)
  return finalDoc
}

export async function deleteTree(slug: string): Promise<void> {
  const row = await db.trees.where('slug').equals(slug).first()
  if (!row) return
  await db.trees.update(row.id, { deletedAt: new Date().toISOString() })
}
