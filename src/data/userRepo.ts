import { db } from './db'
import type { Car, Gap, Photo, Work } from '../domain/types'

// Репозитории пользовательских данных. UUID на клиенте + soft delete.

const now = () => new Date().toISOString()
const uuid = () => crypto.randomUUID()

// ---------- Машины ----------

export async function listCars(): Promise<Car[]> {
  const rows = await db.cars.filter((c) => !c.deletedAt).toArray()
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getCar(id: string): Promise<Car | undefined> {
  const car = await db.cars.get(id)
  return car?.deletedAt ? undefined : car
}

export async function createCar(input: Omit<Car, 'id' | 'createdAt' | 'updatedAt'>): Promise<Car> {
  const car: Car = { ...input, id: uuid(), createdAt: now(), updatedAt: now() }
  await db.cars.add(car)
  return car
}

export async function updateCar(id: string, patch: Partial<Car>): Promise<void> {
  await db.cars.update(id, { ...patch, updatedAt: now() })
}

export async function deleteCar(id: string): Promise<void> {
  await db.cars.update(id, { deletedAt: now(), updatedAt: now() })
}

// ---------- Работы ----------

export async function listWorks(carId?: string): Promise<Work[]> {
  const rows = carId
    ? await db.works.where('carId').equals(carId).toArray()
    : await db.works.toArray()
  return rows
    .filter((w) => !w.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function createWork(input: Omit<Work, 'id' | 'createdAt' | 'updatedAt'>): Promise<Work> {
  const work: Work = { ...input, id: uuid(), createdAt: now(), updatedAt: now() }
  await db.works.add(work)
  return work
}

export async function updateWork(id: string, patch: Partial<Work>): Promise<void> {
  await db.works.update(id, { ...patch, updatedAt: now() })
}

export async function deleteWork(id: string): Promise<void> {
  await db.works.update(id, { deletedAt: now(), updatedAt: now() })
}

// ---------- Фото ----------

export async function listPhotos(filter: { carId?: string; workId?: string }): Promise<Photo[]> {
  let rows: Photo[]
  if (filter.workId) rows = await db.photos.where('workId').equals(filter.workId).toArray()
  else if (filter.carId) rows = await db.photos.where('carId').equals(filter.carId).toArray()
  else rows = await db.photos.toArray()
  return rows.filter((p) => !p.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function addPhoto(input: Omit<Photo, 'id' | 'createdAt'>): Promise<Photo> {
  const photo: Photo = { ...input, id: uuid(), createdAt: now() }
  await db.photos.add(photo)
  return photo
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.update(id, { deletedAt: now() })
}

// ---------- Дырки в дереве (то, что не знал в поле) ----------

export async function addGap(input: Omit<Gap, 'id' | 'createdAt' | 'resolved'>): Promise<Gap> {
  const gap: Gap = { ...input, id: uuid(), resolved: false, createdAt: now() }
  await db.gaps.add(gap)
  return gap
}

export async function listGaps(onlyOpen = false): Promise<Gap[]> {
  const rows = await db.gaps.toArray()
  return rows
    .filter((g) => (onlyOpen ? !g.resolved : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function resolveGap(id: string): Promise<void> {
  await db.gaps.update(id, { resolved: true })
}
