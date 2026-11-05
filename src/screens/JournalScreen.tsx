import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { createCar, listCars } from '../data/userRepo'
import { Button, Card, Empty, Screen, inputClass } from '../ui/kit'

export function JournalScreen() {
  const cars = useLiveQuery(() => listCars(), [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ make: '', model: '', year: '', engine: '', plate: '' })

  async function save() {
    if (!form.make.trim() && !form.model.trim()) return
    await createCar({
      make: form.make.trim(),
      model: form.model.trim(),
      year: form.year ? Number(form.year) : undefined,
      engine: form.engine.trim() || undefined,
      plate: form.plate.trim() || undefined,
    })
    setForm({ make: '', model: '', year: '', engine: '', plate: '' })
    setAdding(false)
  }

  return (
    <Screen>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Журнал</h1>
        <Button onClick={() => setAdding((v) => !v)} className="min-h-10 px-3 text-sm">
          {adding ? 'Отмена' : '+ Машина'}
        </Button>
      </div>

      {adding && (
        <Card className="mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputClass}
              placeholder="Марка"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Модель"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Год"
              inputMode="numeric"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Двигатель"
              value={form.engine}
              onChange={(e) => setForm({ ...form, engine: e.target.value })}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Госномер"
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
          />
          <Button onClick={save}>Сохранить</Button>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {cars?.map((c) => (
          <Link key={c.id} to={`/car/${c.id}`}>
            <Card className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {c.make} {c.model} {c.year ? `, ${c.year}` : ''}
                </div>
                <div className="text-xs text-muted">
                  {c.engine || '—'} {c.plate ? `· ${c.plate}` : ''}
                </div>
              </div>
              <span className="text-muted">→</span>
            </Card>
          </Link>
        ))}
        {cars?.length === 0 && <Empty>Пока ни одной машины. Добавь первую.</Empty>}
      </div>
    </Screen>
  )
}
