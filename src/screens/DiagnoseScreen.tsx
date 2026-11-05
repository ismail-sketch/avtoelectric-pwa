import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { Card, Screen } from '../ui/kit'

export function DiagnoseScreen() {
  const trees = useLiveQuery(
    async () => (await db.trees.toArray()).filter((t) => !t.deletedAt).sort((a, b) => a.title.localeCompare(b.title, 'ru')),
    [],
  )

  return (
    <Screen>
      <h1 className="mb-4 text-xl font-semibold">Диагностика</h1>

      <div className="flex flex-col gap-3">
        {trees?.map((t) => {
          const count = Object.keys(t.doc.nodes).length
          return (
            <Link key={t.id} to={`/run/${t.slug}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted">
                    {t.version} версия · {count} шагов
                  </div>
                </div>
                <span className="text-muted">→</span>
              </Card>
            </Link>
          )
        })}
        {trees?.length === 0 && (
          <Card>
            <p className="text-sm text-muted">
              Пока пусто. Импортируй дерево из таблицы в настройках.
            </p>
          </Card>
        )}
      </div>

      <Link to="/settings" className="mt-6 block text-center text-sm text-accent">
        + Добавить своё дерево
      </Link>
    </Screen>
  )
}
