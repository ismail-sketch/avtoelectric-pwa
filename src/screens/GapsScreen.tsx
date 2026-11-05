import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listGaps, resolveGap } from '../data/userRepo'
import { Button, Card, Empty, Screen, TopBar } from '../ui/kit'

export function GapsScreen() {
  const navigate = useNavigate()
  const gaps = useLiveQuery(() => listGaps(), [])

  const open = gaps?.filter((g) => !g.resolved) ?? []
  const done = gaps?.filter((g) => g.resolved) ?? []

  return (
    <Screen>
      <TopBar title="Дырки в деревьях" onBack={() => navigate(-1)} />

      <p className="mb-4 text-sm text-muted">
        Места, где ты в поле не знал, что делать. Дома допиши ветку в таблицу и импортируй дерево.
      </p>

      <div className="flex flex-col gap-2">
        {open.map((g) => (
          <Card key={g.id}>
            <div className="text-xs text-muted">{g.treeSlug}</div>
            <div className="text-sm font-medium">{g.question}</div>
            {g.note && <div className="mt-1 text-sm text-muted">{g.note}</div>}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">{new Date(g.createdAt).toLocaleString('ru')}</span>
              <Button variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => resolveGap(g.id)}>
                Дописал
              </Button>
            </div>
          </Card>
        ))}
        {open.length === 0 && <Empty>Открытых нет. Хороший знак.</Empty>}
      </div>

      {done.length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-muted">Закрытые ({done.length})</summary>
          <div className="mt-2 flex flex-col gap-2">
            {done.map((g) => (
              <Card key={g.id} className="py-2 opacity-60">
                <div className="text-sm line-through">{g.question}</div>
              </Card>
            ))}
          </div>
        </details>
      )}
    </Screen>
  )
}