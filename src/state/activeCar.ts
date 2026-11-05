import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Car } from '../domain/types'

interface ActiveCarStore {
  car: Car | null
  setCar: (car: Car | null) => void
}

/** Текущая машина, к которой привязываются прохождения и фото. */
export const useActiveCar = create<ActiveCarStore>()(
  persist(
    (set) => ({
      car: null,
      setCar: (car) => set({ car }),
    }),
    { name: 'avtoelectric-active-car' },
  ),
)
