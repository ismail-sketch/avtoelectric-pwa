import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, requestPersistence } from '../data/db'
import { CSV_TEMPLATE, treeFromCsv } from '../data/treeImport'
import { downloadBlob, exportBackup, importBackup } from '../data/backup'
import { saveTree } from '../data/treeRepo'
import { validateTree } from '../domain/treeEngine'
import { Button, Card, Screen, TopBar } from '../ui/kit'

export function SettingsScreen() {
  const navigate = useNavigate()
  const trees = useLiveQuery(async () => (await db.trees.toArray()).filter((t) => !t.deletedAt), [])
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false))
  }, [])

  function flash(kind: 'ok' | 'bad', text: string) {
    setMessage({ kind, text })
  }

  async function onCsv(file: File) {
    setImporting(true)
    try {
      const csv = await file.text()
      const title = file.name.replace(/\.csv$/i, '')
      const slug = title.toLowerCase().replace(/[^a-z0-9а-я]+/gi, '-')
      const doc = treeFromCsv(csv, { slug, title })
      await saveTree(doc)
      flash('ok', `Дерево «${title}» импортировано: ${Object.keys(doc.nodes).length} узлов`)
    } catch (e) {
      flash('bad', e instanceof Error ? e.message : 'Ошибка импорта')
    } finally {
      setImporting(false)
    }
  }

  async function checkAll() {
    const rows = await db.trees.toArray()
    const all = rows.filter((r) => !r.deletedAt).flatMap((r) => validateTree(r.doc).map((e) => `${r.title}: ${e}`))
    flash(all.length ? 'bad' : 'ok', all.length ? all.join('\n') : 'Все деревья целые')
  }

  return (
    <Screen>
      <TopBar title="Настройки" onBack={() => navigate(-1)} />

      {message && (
        <Card
          className={`mb-4 whitespace-pre-wrap text-sm ${
            message.kind === 'ok' ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad'
          }`}
        >
          {message.text}
        </Card>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-medium text-muted">Деревья</h2>
        <div className="flex flex-col gap-2">
          {trees?.map((t) => (
            <Card key={t.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted">
                    v{t.version} · {Object.keys(t.doc.nodes).length} узлов
                  </div>
                </div>
                <button
                  className="text-xs text-bad/70"
                  onClick={async () => {
                    if (!confirm(`Удалить дерево «${t.title}»?`)) return
                    await db.trees.update(t.id, { deletedAt: new Date().toISOString() })
                  }}
                >
                  Удалить
                </button>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <label className="flex-1">
            <span className="block cursor-pointer rounded-xl bg-accent px-4 py-3 text-center text-sm font-medium text-ink">
              {importing ? 'Импортирую…' : 'Импорт CSV'}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onCsv(f)
                e.target.value = ''
              }}
            />
          </label>
          <Button variant="ghost" className="flex-1" onClick={checkAll}>
            Проверить
          </Button>
        </div>
        <button
          className="mt-2 w-full text-center text-xs text-accent"
          onClick={() => downloadBlob(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'shablon-dereva.csv')}
        >
          Скачать шаблон CSV
        </button>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-medium text-muted">Резервная копия</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={async () => {
              const blob = await exportBackup()
              const stamp = new Date().toISOString().slice(0, 10)
              downloadBlob(blob, `avtoelectric-backup-${stamp}.json`)
              flash('ok', 'Копия скачана. Сохрани её не только в телефоне.')
            }}
          >
            Экспорт
          </Button>
          <label className="flex-1">
            <span className="block cursor-pointer rounded-xl border border-line bg-surface-2 px-4 py-3 text-center text-sm">
              Импорт
            </span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  flash('ok', await importBackup(f))
                } catch (err) {
                  flash('bad', err instanceof Error ? err.message : 'Ошибка импорта')
                }
              }}
            />
          </label>
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-medium text-muted">Хранилище</h2>
        <Card className="text-sm">
          <p>
            Защита от очистки браузером:{' '}
            <span className={persisted ? 'text-ok' : 'text-warn'}>
              {persisted == null ? 'проверяю…' : persisted ? 'включена' : 'не включена'}
            </span>
          </p>
          {!persisted && (
            <Button
              variant="ghost"
              className="mt-3 w-full text-sm"
              onClick={async () => setPersisted(await requestPersistence())}
            >
              Запросить защиту
            </Button>
          )}
        </Card>
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Данные лежат только на этом устройстве. Чтобы перенести на другой телефон — экспорт и импорт.
      </p>
    </Screen>
  )
}
