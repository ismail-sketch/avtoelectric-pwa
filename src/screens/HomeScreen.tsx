import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { ensureSeed } from '../data/treeRepo'
import { noStartTree } from '../content/noStartTree'
import { Card, Screen } from '../ui/kit'

export function HomeScreen() {
  const navigate = useNavigate()
  const stats = useLiveQuery(async () => {
    const [cars, works, gaps] = await Promise.all([
      db.cars.filter((c) => !c.deletedAt).count(),
      db.works.filter((w) => !w.deletedAt).count(),
      db.gaps.filter((g) => !g.resolved).count(),
    ])
    return { cars, works, gaps }
  }, [])

  useEffect(() => {
    ensureSeed()
  }, [])

  return (    <Screen>
      <header className="mb-5 flex items-start justify-between pt-1">
        <div>
          <p className="text-sm text-muted">Помощник</p>
          <h1 className="text-2xl font-semibold">Автоэлектрик</h1>
        </div>
        <Link
          to="/settings"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-lg"
          aria-label="Настройки"
        >
          ⚙
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/diagnose" className="col-span-2">
          <Card className="flex items-center justify-between bg-gradient-to-br from-accent/15 to-transparent">
            <div>
              <div className="text-lg font-semibold">Диагностика</div>
              <div className="text-sm text-muted">Дерево по симптому, шаг за шагом</div>
            </div>
            <span className="text-2xl text-accent">⌁</span>
          </Card>
        </Link>

        <Link to="/calc">
          <Card className="h-full">
            <div className="text-base font-medium">Расчёты</div>
            <div className="mt-1 text-xs text-muted">Падение, сечение, утечка</div>
          </Card>
        </Link>

        <Link to="/journal">
          <Card className="h-full">
            <div className="text-base font-medium">Журнал</div>
            <div className="mt-1 text-xs text-muted">
              {stats?.cars ?? 0} машин · {stats?.works ?? 0} работ
            </div>
          </Card>
        </Link>
      </div>

      <button onClick={() => navigate(`/run/${noStartTree.slug}`)} className="mt-3 text-left">
        <Card className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">Быстрый старт</div>
            <div className="font-medium">Не заводится</div>
          </div>
          <span className="text-muted">→</span>
        </Card>
      </button>

      {!!stats?.gaps && (
        <Link to="/gaps" className="mt-3 block">
          <Card className="border-warn/40 bg-warn/10">
            <div className="text-sm text-warn">
              {stats.gaps} мест, где ты не знал, что делать — допиши дома
            </div>
          </Card>
        </Link>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Работает офлайн. Данные хранятся на телефоне. Делай резервную копию в настройках.
      </p>
    </Screen>
  )
}
