import Dexie, { type EntityTable } from 'dexie'
import type { Car, Gap, Photo, TreeDoc, Work } from '../domain/types'

// Две зоны: контент (можно потерять и импортировать заново) и
// пользовательские данные (нельзя терять никогда).

export interface TreeRow {
  id: string
  slug: string
  title: string
  version: number
  doc: TreeDoc
  updatedAt: string
  deletedAt?: string
}

export interface Setting {
  key: string
  value: unknown
}

class AppDB extends Dexie {
  trees!: EntityTable<TreeRow, 'id'>
  cars!: EntityTable<Car, 'id'>
  works!: EntityTable<Work, 'id'>
  photos!: EntityTable<Photo, 'id'>
  gaps!: EntityTable<Gap, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('avtoelectric')
    // v1 — схема. При изменении схемы добавлять version(2).stores(...) и миграцию.
    this.version(1).stores({
      trees: 'id, slug, title, updatedAt',
      cars: 'id, updatedAt, deletedAt, plate, vin',
      works: 'id, carId, status, createdAt, updatedAt, deletedAt',
      photos: 'id, carId, workId, kind, createdAt, deletedAt',
      gaps: 'id, treeSlug, resolved, createdAt',
      settings: 'key',
    })
  }
}

export const db = new AppDB()

// Просим браузер не вычищать данные при нехватке места.
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
