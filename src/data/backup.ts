import { db } from './db'
import type { Car, Gap, Photo, Work } from '../domain/types'

// Экспорт/импорт. Пользовательские данные — святое, бэкап обязателен.

interface Dump {
  format: 'avtoelectric-backup'
  version: 1
  exportedAt: string
  cars: Car[]
  works: Work[]
  gaps: Gap[]
  photos: Array<Omit<Photo, 'blob'> & { dataUrl: string }>
  settings: Array<{ key: string; value: unknown }>
}

export async function exportBackup(): Promise<Blob> {
  const [cars, works, gaps, photos, settings] = await Promise.all([
    db.cars.toArray(),
    db.works.toArray(),
    db.gaps.toArray(),
    db.photos.toArray(),
    db.settings.toArray(),
  ])

  const dump: Dump = {
    format: 'avtoelectric-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    cars,
    works,
    gaps,
    photos: await Promise.all(
      photos.map(async ({ blob, ...rest }) => ({ ...rest, dataUrl: await blobToDataUrl(blob) })),
    ),
    settings,
  }

  return new Blob([JSON.stringify(dump)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function importBackup(file: File): Promise<string> {
  const text = await file.text()
  const dump = JSON.parse(text) as Dump

  if (dump.format !== 'avtoelectric-backup') throw new Error('Это не файл резервной копии')

  // Режим "добавить": существующие записи по id перезаписываются.
  await db.transaction('rw', [db.cars, db.works, db.gaps, db.photos, db.settings], async () => {
    await db.cars.bulkPut(dump.cars ?? [])
    await db.works.bulkPut(dump.works ?? [])
    await db.gaps.bulkPut(dump.gaps ?? [])
    await db.photos.bulkPut(
      await Promise.all(
        (dump.photos ?? []).map(async ({ dataUrl, ...rest }) => ({ ...rest, blob: dataUrlToBlob(dataUrl) })),
      ),
    )
    await db.settings.bulkPut(dump.settings ?? [])
  })

  return `Импортировано: ${dump.cars?.length ?? 0} машин, ${dump.works?.length ?? 0} работ, ${dump.photos?.length ?? 0} фото`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(head)?.[1] ?? 'application/octet-stream'
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}
