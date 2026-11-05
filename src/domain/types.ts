// Доменные типы. Без React, без Dexie — чистая логика.

export type NodeId = string

export interface TreeOption {
  label: string
  next: NodeId
}

export type TreeNode =
  | {
      id: NodeId
      type: 'question'
      text: string
      note?: string
      stop?: string // стоп-правило, показывается красным
      options: TreeOption[]
    }
  | {
      id: NodeId
      type: 'check'
      text: string // что проверяем
      tool?: string // чем проверяем
      points?: string // точки подключения
      norm?: string // норма
      ifBad?: string // что делать, если не норма
      next?: NodeId // куда идти, если норма
      badNext?: NodeId // куда идти, если не норма (опционально)
      stop?: string
      note?: string
    }
  | {
      id: NodeId
      type: 'outcome'
      text: string
      note?: string
      stop?: string
    }

export interface TreeDoc {
  id: string // uuid
  slug: string // стабильный идентификатор, напр. 'no-start'
  title: string
  version: number
  rootId: NodeId
  nodes: Record<NodeId, TreeNode>
  updatedAt: string // ISO
}

export type Verdict = 'ok' | 'bad' | 'unknown'

export interface StepRecord {
  nodeId: NodeId
  nodeText: string
  verdict?: Verdict
  answer?: string // выбранный вариант
}

export interface RunState {
  treeId: string
  currentId: NodeId
  steps: StepRecord[] // пройденный путь
  finished: boolean
}

// ---- Пользовательские данные ----

export interface Car {
  id: string // uuid
  make: string
  model: string
  year?: number
  engine?: string
  vin?: string
  plate?: string
  mileage?: number
  notes?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Work {
  id: string // uuid
  carId: string
  treeSlug?: string
  treeTitle?: string
  symptom?: string
  steps: StepRecord[]
  summary?: string // что сделали
  measurements?: string // замеры
  price?: number
  status: 'open' | 'done'
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Photo {
  id: string
  carId: string
  workId?: string
  kind: 'before' | 'after' | 'defect' | 'other'
  caption?: string
  blob: Blob
  createdAt: string
  deletedAt?: string
}

export interface Gap {
  id: string
  treeSlug: string
  nodeId: NodeId
  question: string
  note?: string
  resolved: boolean
  createdAt: string
}
