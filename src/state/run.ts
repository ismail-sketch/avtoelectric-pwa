import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunState } from '../domain/types'

interface RunStore {
  run: RunState | null
  setRun: (run: RunState | null) => void
}

export const useRun = create<RunStore>()(
  persist(
    (set) => ({
      run: null,
      setRun: (run) => set({ run }),
    }),
    { name: 'avtoelectric-run' },
  ),
)
