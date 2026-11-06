import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getTreeBySlug, ensureSeed } from '../data/treeRepo'
import { addGap, createWork } from '../data/userRepo'
import { db } from '../data/db'
import { withTimeout } from '../data/withTimeout'
import { check, getNode, pick, start } from '../domain/treeEngine'
import type { RunState, TreeDoc, Verdict } from '../domain/types'
import { useRun } from '../state/run'
import { useActiveCar } from '../state/activeCar'
import { Button, Card, Screen, TopBar, inputClass } from '../ui/kit'

const verdictLabel: Record<Verdict, string> = {
  ok: 'Норма',
  bad: 'Не норма',
  unknown: 'Не знаю',
}

export function RunScreen() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tree, setTree] = useState<TreeDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<RunState[]>([]) // для «назад»
  const { run, setRun } = useRun()
  const { car: activeCar, setCar } = useActiveCar()

  const [showSave, setShowSave] = useState(false)
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)

  const cars = useLiveCars()

  useEffect(() => {
    if (!slug) return
    const applyTree = (t: TreeDoc) => {
      setTree(t)
      // Состояние прохождения могло остаться от прошлой версии дерева:
      // id сохраняется при импорте, а узлы меняются. Если currentId исчез —
      // начинаем заново, иначе экран будет пустым.
      const valid = run != null && run.treeId === t.id && Boolean(t.nodes[run.currentId])
      if (!valid) setRun(start(t))
    }

    getTreeBySlug(slug)
      .then(async (t) => {
        if (t) {
          applyTree(t)
          return
        }
        // Первый запуск: сид мог ещё не записаться — пробуем ещё раз.
        try {
          await ensureSeed()
        } catch {
          setError('База не отвечает. Перезагрузи приложение.')
          return
        }
        const retry = await getTreeBySlug(slug)
        if (!retry) {
          setError('Дерево не найдено')
          return
        }
        applyTree(retry)
      })
      .catch(() => setError('Не удалось загрузить дерево. Перезагрузи приложение.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const node = useMemo(() => {
    if (!tree || !run || !run.currentId) return null
    try {
      return getNode(tree, run.currentId)
    } catch {
      return null
    }
  }, [tree, run])

  function push(prev: RunState) {
    setHistory((h) => [...h.slice(-30), prev])
  }

  function onPick(i: number) {
    if (!tree || !run) return
    push(run)
    setRun(pick(tree, run, i))
  }

  function onCheck(v: Verdict) {
    if (!tree || !run) return
    push(run)
    setRun(check(tree, run, v))
  }

  async function onUnknownNote(text?: string) {
    if (!tree || !run || !node) throw new Error('Шаг недоступен. Перезагрузи приложение.')
    // Ждём запись: иначе UI пишет «Записал», даже если база не ответила.
    await withTimeout(
      addGap({
        treeSlug: tree.slug,
        nodeId: node.id,
        question: node.text,
        note: text,
      }),
      15000,
      'База не отвечает. Дырка не записана — перезагрузи приложение.',
    )
  }

  function onBack() {
    const prev = history.at(-1)
    if (!prev) return
    setHistory((h) => h.slice(0, -1))
    setRun(prev)
  }

  function onRestart() {
    if (!tree) return
    setHistory([])
    setRun(start(tree))
    setShowSave(false)
  }

  async function onSave() {
    if (!tree || !run || !activeCar) return
    setSaving(true)
    try {
      const last = run.steps.at(-1)
      await createWork({
        carId: activeCar.id,
        treeSlug: tree.slug,
        treeTitle: tree.title,
        symptom: run.steps[0]?.nodeText,
        steps: run.steps,
        summary: summary || last?.nodeText,
        status: 'done',
      })
      setRun(null)
      setHistory([])
      setShowSave(false)
      navigate(`/car/${activeCar.id}`)
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <Screen>
        <TopBar title="Ошибка" onBack={() => navigate(-1)} />
        <Card>{error}</Card>
      </Screen>
    )
  }
  if (!tree || !run || !node) {
    return (
      <Screen>
        <TopBar title={tree?.title ?? '…'} onBack={() => navigate('/diagnose')} />
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {tree ? 'Не удалось открыть текущий шаг.' : 'Загружаю дерево…'}
          </p>
          {tree && (
            <Button onClick={onRestart}>Начать заново</Button>
          )}
        </Card>
      </Screen>
    )
  }

  const canBack = history.length > 0

  return (
    <Screen>
      <TopBar
        title={tree.title}
        onBack={() => (canBack ? onBack() : navigate('/diagnose'))}
        right={
          <button
            onClick={onRestart}
            className="flex h-11 items-center rounded-xl border border-line bg-surface px-3 text-sm text-muted"
          >
            Заново
          </button>
        }
      />

      {/* Путь */}
      {run.steps.length > 0 && (
        <div className="mb-4 rounded-xl border border-line bg-surface-2 p-3 text-xs text-muted">
          {run.steps.slice(-3).map((s, i) => (
            <div key={`${s.nodeId}-${i}`} className="truncate">
              <span className="text-fg/70">{s.nodeText}</span>
              {s.answer && <span className="text-accent"> → {s.answer}</span>}
              {s.verdict && <span className="text-accent"> → {verdictLabel[s.verdict]}</span>}
            </div>
          ))}
          {run.steps.length > 3 && <div className="mt-1 opacity-70">… всего шагов: {run.steps.length}</div>}
        </div>
      )}

      {/* Узел */}
      <Card className="mb-3">
        <p className="text-lg font-medium leading-snug">{node.text}</p>

        {node.type === 'check' && (
          <div className="mt-3 space-y-1.5 text-sm">
            {node.tool && <Row k="Чем" v={node.tool} />}
            {node.points && <Row k="Точки" v={node.points} />}
            {node.norm && <Row k="Норма" v={node.norm} accent />}
            {node.ifBad && <Row k="Если не норма" v={node.ifBad} />}
          </div>
        )}
        {node.type === 'outcome' && node.note && <p className="mt-3 text-sm text-muted">{node.note}</p>}
        {node.type === 'question' && node.note && <p className="mt-2 text-sm text-muted">{node.note}</p>}

        {node.stop && (
          <p className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
            ⚠ {node.stop}
          </p>
        )}
      </Card>

      {/* Действия по типу узла */}
      {node.type === 'question' && (
        <div className="flex flex-col gap-2">
          {node.options.map((o, i) => (
            <Button key={o.next + i} onClick={() => onPick(i)} className="text-left">
              {o.label}
            </Button>
          ))}
        </div>
      )}

      {node.type === 'check' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ok" onClick={() => onCheck('ok')}>
              ✓ Норма
            </Button>
            <Button variant="bad" onClick={() => onCheck('bad')}>
              ✗ Не норма
            </Button>
          </div>
          <UnknownButton key={node.id} onNote={onUnknownNote} />
        </div>
      )}

      {node.type === 'outcome' && (
        <div className="flex flex-col gap-2">
          {!showSave && (
            <Button onClick={() => setShowSave(true)}>Сохранить в журнал</Button>
          )}
          {showSave && (
            <Card className="flex flex-col gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Машина</span>
                <select
                  className={inputClass}
                  value={activeCar?.id ?? ''}
                  onChange={(e) => {
                    const c = cars?.find((x) => x.id === e.target.value)
                    setCar(c ?? null)
                  }}
                >
                  <option value="">— выбрать —</option>
                  {cars?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.make} {c.model}
                      {c.year ? `, ${c.year}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Что сделал</span>
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Например: почистил массу под крылом"
                />
              </label>
              {!cars?.length && (
                <p className="text-xs text-warn">Сначала добавь машину в журнале.</p>
              )}
              <Button onClick={onSave} disabled={!activeCar || saving}>
                {saving ? 'Сохраняю…' : 'Сохранить работу'}
              </Button>
            </Card>
          )}
          <Button variant="ghost" onClick={onRestart}>
            Начать заново
          </Button>
        </div>
      )}

      {!run.finished && node.type !== 'outcome' && (
        <p className="mt-6 text-center text-xs text-muted">
          Шаг {run.steps.length + 1} · «Не знаю» записывается в дырки, чтобы дописать дома
        </p>
      )}
    </Screen>
  )
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-muted">{k}</span>
      <span className={accent ? 'font-medium text-ok' : 'text-fg/90'}>{v}</span>
    </div>
  )
}

function UnknownButton({ onNote }: { onNote: (text?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  if (status === 'saved') {
    return (
      <div className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
        Записал в «дырки» — допишешь дома.{' '}
        <Link to="/gaps" className="underline">
          Открыть список
        </Link>
      </div>
    )
  }

  if (!open) {
    return (
      <Button variant="warn" onClick={() => setOpen(true)}>
        ? Не знаю, что дальше
      </Button>
    )
  }

  async function save() {
    setStatus('saving')
    setError('')
    try {
      await onNote(text)
      setStatus('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось записать')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
      <textarea
        className={`${inputClass} min-h-16`}
        placeholder="Что непонятно? (необязательно)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {status === 'error' && <p className="text-sm text-bad">{error}</p>}
      <Button variant="warn" onClick={save} disabled={status === 'saving'}>
        {status === 'saving' ? 'Записываю…' : 'Записать'}
      </Button>
    </div>
  )
}

function useLiveCars() {
  return useLiveQuery(async () => {
    const rows = await db.cars.toArray()
    return rows.filter((c) => !c.deletedAt)
  }, [])
}
