import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addPhoto, deleteCar, getCar, listPhotos, listWorks, updateCar } from '../data/userRepo'
import { compressImage, formatBytes } from '../data/image'
import { useActiveCar } from '../state/activeCar'
import { Button, Card, Empty, Screen, TopBar, inputClass } from '../ui/kit'

export function CarScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { car: activeCar, setCar } = useActiveCar()
  const [editing, setEditing] = useState(false)

  const car = useLiveQuery(() => (id ? getCar(id) : undefined), [id])
  const works = useLiveQuery(() => (id ? listWorks(id) : []), [id])
  const photos = useLiveQuery(() => (id ? listPhotos({ carId: id }) : []), [id])

  const [form, setForm] = useState({ make: '', model: '', year: '', engine: '', vin: '', plate: '', mileage: '' })

  if (!car) return <Screen><TopBar title="Машина" onBack={() => navigate(-1)} /></Screen>

  const isActive = activeCar?.id === car.id

  function startEdit() {
    setForm({
      make: car!.make,
      model: car!.model,
      year: car!.year ? String(car!.year) : '',
      engine: car!.engine ?? '',
      vin: car!.vin ?? '',
      plate: car!.plate ?? '',
      mileage: car!.mileage ? String(car!.mileage) : '',
    })
    setEditing(true)
  }

  async function save() {
    await updateCar(car!.id, {
      make: form.make,
      model: form.model,
      year: form.year ? Number(form.year) : undefined,
      engine: form.engine || undefined,
      vin: form.vin || undefined,
      plate: form.plate || undefined,
      mileage: form.mileage ? Number(form.mileage) : undefined,
    })
    setEditing(false)
  }

  async function onPhoto(file: File, kind: 'before' | 'after' | 'defect') {
    const blob = await compressImage(file)
    await addPhoto({ carId: car!.id, kind, blob })
  }

  return (
    <Screen>
      <TopBar
        title={`${car.make} ${car.model}`}
        onBack={() => navigate(-1)}
        right={
          <button onClick={startEdit} className="flex h-11 items-center rounded-xl border border-line bg-surface px-3 text-sm">
            ✎
          </button>
        }
      />

      {editing ? (
        <Card className="mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Марка" />
            <input className={inputClass} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Модель" />
            <input className={inputClass} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Год" inputMode="numeric" />
            <input className={inputClass} value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} placeholder="Двигатель" />
          </div>
          <input className={inputClass} value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="VIN" />
          <input className={inputClass} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="Госномер" />
          <input className={inputClass} value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} placeholder="Пробег" inputMode="numeric" />
          <Button onClick={save}>Сохранить</Button>
        </Card>
      ) : (
        <Card className="mb-4">
          <dl className="space-y-1 text-sm">
            {car.year && <Line k="Год" v={String(car.year)} />}
            {car.engine && <Line k="Двигатель" v={car.engine} />}
            {car.vin && <Line k="VIN" v={car.vin} />}
            {car.plate && <Line k="Номер" v={car.plate} />}
            {car.mileage != null && <Line k="Пробег" v={`${car.mileage.toLocaleString('ru')} км`} />}
          </dl>
          <div className="mt-3 flex gap-2">
            <Button
              variant={isActive ? 'ok' : 'ghost'}
              onClick={() => setCar(isActive ? null : car)}
              className="flex-1 text-sm"
            >
              {isActive ? '✓ Текущая машина' : 'Сделать текущей'}
            </Button>
          </div>
        </Card>
      )}

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Фото</h2>
          <div className="flex gap-2 text-xs">
            <PhotoInput label="До" onFile={(f) => onPhoto(f, 'before')} />
            <PhotoInput label="Дефект" onFile={(f) => onPhoto(f, 'defect')} />
            <PhotoInput label="После" onFile={(f) => onPhoto(f, 'after')} />
          </div>
        </div>
        {photos?.length ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <PhotoThumb key={p.id} photo={p} />
            ))}
          </div>
        ) : (
          <Empty>Фото пока нет</Empty>
        )}
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-medium text-muted">Работы</h2>
        <div className="flex flex-col gap-2">
          {works?.map((w) => (
            <Link key={w.id} to={`/work/${w.id}`}>
              <Card className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{w.treeTitle ?? w.symptom ?? 'Работа'}</div>
                  <div className="text-xs text-muted">
                    {new Date(w.createdAt).toLocaleDateString('ru')} · {w.steps.length} шагов
                  </div>
                </div>
                <span className="text-muted">→</span>
              </Card>
            </Link>
          ))}
          {works?.length === 0 && <Empty>Работ ещё нет</Empty>}
        </div>
      </section>

      <button
        onClick={async () => {
          if (!confirm('Удалить машину? Данные останутся в резервной копии, если сделаешь её заранее.')) return
          await deleteCar(car.id)
          navigate('/journal')
        }}
        className="mt-4 text-center text-xs text-bad/70"
      >
        Удалить машину
      </button>
    </Screen>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-muted">{k}</span>
      <span className="break-all">{v}</span>
    </div>
  )
}

function PhotoInput({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  return (
    <label className="cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-muted">
      + {label}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </label>
  )
}

function PhotoThumb({ photo }: { photo: { blob: Blob; kind: string; caption?: string } }) {
  const [url] = useState(() => URL.createObjectURL(photo.blob))
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-2">
      <img src={url} alt={photo.caption ?? photo.kind} className="h-24 w-full object-cover" />
      <div className="flex justify-between px-1.5 py-1 text-[10px] text-muted">
        <span>{photo.kind === 'before' ? 'до' : photo.kind === 'after' ? 'после' : 'дефект'}</span>
        <span>{formatBytes(photo.blob.size)}</span>
      </div>
    </div>
  )
}
