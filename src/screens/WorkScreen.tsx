import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { deleteWork, updateWork } from '../data/userRepo'
import { Button, Card, Screen, TopBar, inputClass } from '../ui/kit'

const verdictLabel: Record<string, string> = { ok: 'норма', bad: 'не норма', unknown: 'не знаю' }

export function WorkScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const work = useLiveQuery(() => (id ? db.works.get(id) : undefined), [id])

  if (!work) return <Screen><TopBar title="Работа" onBack={() => navigate(-1)} /></Screen>

  return (
    <Screen>
      <TopBar title={work.treeTitle ?? 'Работа'} onBack={() => navigate(-1)} />

      <Card className="mb-3">
        <div className="text-xs text-muted">{new Date(work.createdAt).toLocaleString('ru')}</div>
        <div className="mt-1 text-sm">Шагов: {work.steps.length}</div>
      </Card>

      <div className="mb-3 flex flex-col gap-2">
        {work.steps.map((s, i) => (
          <Card key={i} className="py-3">
            <div className="text-xs text-muted">Шаг {i + 1}</div>
            <div className="text-sm">{s.nodeText}</div>
            {s.answer && <div className="text-sm text-accent">→ {s.answer}</div>}
            {s.verdict && (
              <div
                className={`text-sm ${
                  s.verdict === 'ok' ? 'text-ok' : s.verdict === 'bad' ? 'text-bad' : 'text-warn'
                }`}
              >
                → {verdictLabel[s.verdict]}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="mb-3 flex flex-col gap-3 no-print">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Итог</span>
          <textarea
            className={`${inputClass} min-h-20`}
            defaultValue={work.summary ?? ''}
            onBlur={(e) => updateWork(work.id, { summary: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Замеры</span>
          <textarea
            className={`${inputClass} min-h-16`}
            placeholder="Утечка 38 мА, просадка 10,9 В"
            defaultValue={work.measurements ?? ''}
            onBlur={(e) => updateWork(work.id, { measurements: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Сумма, ₽</span>
          <input
            type="number"
            inputMode="decimal"
            className={inputClass}
            defaultValue={work.price ?? ''}
            onBlur={(e) => updateWork(work.id, { price: Number(e.target.value) || undefined })}
          />
        </label>
      </Card>

      <div className="flex gap-2 no-print">
        <Button variant="ghost" className="flex-1" onClick={() => window.print()}>
          Печать / PDF
        </Button>
        <Button
          variant="bad"
          className="flex-1"
          onClick={async () => {
            if (!confirm('Удалить работу?')) return
            await deleteWork(work.id)
            navigate(-1)
          }}
        >
          Удалить
        </Button>
      </div>
    </Screen>
  )
}