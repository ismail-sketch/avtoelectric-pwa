import { useEffect, useState } from 'react'
import {
  ampsForSection,
  chooseWire,
  leakageDrain,
  recommendedSection,
  requiredSection,
  socFromVoltage,
  voltageDrop,
  type Material,
} from '../domain/calculators'
import { Card, Screen, inputClass } from '../ui/kit'
import { parseNumInput } from '../ui/numInput'

const fmt = (n: number, digits = 2) =>
  Number.isFinite(n) ? n.toFixed(digits).replace('.', ',') : '—'

/** Целые без дробной части, дробные — с одним знаком. */
const fmtShort = (n: number) =>
  !Number.isFinite(n) ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')

const isNum = (n: number) => Number.isFinite(n)

type Tab = 'drop' | 'section' | 'leak' | 'soc'

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'drop', label: 'Падение' },
  { id: 'section', label: 'Сечение' },
  { id: 'leak', label: 'Утечка' },
  { id: 'soc', label: 'Заряд АКБ' },
]

export function CalcScreen() {
  const [tab, setTab] = useState<Tab>('drop')

  return (
    <Screen>
      <h1 className="mb-4 text-xl font-semibold">Расчёты</h1>

      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl border border-line bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg py-2 text-xs font-medium ${
              tab === t.id ? 'bg-accent text-ink' : 'text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'drop' && <DropCalc />}
      {tab === 'section' && <SectionCalc />}
      {tab === 'leak' && <LeakCalc />}
      {tab === 'soc' && <SocCalc />}
    </Screen>
  )
}

/**
 * Числовое поле.
 * Хранит то, что реально ввёл пользователь (строку), а не только число.
 * Иначе пустое поле превращается в 0, и ноль невозможно стереть.
 * Пустое или кривое значение отдаётся наружу как NaN.
 */
function Num({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  suffix?: string
}) {
  const [raw, setRaw] = useState(() => (isNum(value) ? String(value) : ''))
  const [focused, setFocused] = useState(false)

  // Если значение поменяли снаружи (например, сброс), подтягиваем его.
  useEffect(() => {
    if (focused) return
    const current = parseNumInput(raw)
    if (isNum(value) && current !== value) setRaw(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])

  function handle(text: string) {
    setRaw(text)
    onChange(parseNumInput(text))
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={raw}
          placeholder="—"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => handle(e.target.value)}
          className={inputClass}
        />
        {suffix && <span className="w-10 shrink-0 text-sm text-muted">{suffix}</span>}
      </div>
    </label>
  )
}

function MaterialSelect({ value, onChange }: { value: Material; onChange: (m: Material) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">Материал</span>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as Material)}>
        <option value="copper">Медь</option>
        <option value="aluminum">Алюминий</option>
      </select>
    </label>
  )
}

/** Нормы падения по типу цепи, В (двухпроводная линия). */
const DROP_NORMS = [
  { id: 'power', label: 'Силовая / стартер', max: 0.5 },
  { id: 'light', label: 'Освещение, приборы', max: 0.3 },
  { id: 'signal', label: 'Сигнал, датчики', max: 0.1 },
] as const

type DropNorm = (typeof DROP_NORMS)[number]['id']

function DropCalc() {
  const [currentA, setCurrentA] = useState(8)
  const [lengthM, setLengthM] = useState(4)
  const [section, setSection] = useState(1.5)
  const [material, setMaterial] = useState<Material>('copper')
  const [norm, setNorm] = useState<DropNorm>('power')

  const valid = isNum(currentA) && isNum(lengthM) && isNum(section) && section > 0
  const allowedDropV = DROP_NORMS.find((n) => n.id === norm)!.max

  const r = valid
    ? voltageDrop({ currentA, lengthM, sectionMm2: section, material, allowedDropV })
    : {
        dropV: Number.NaN,
        voltageAtLoad: Number.NaN,
        dropPercent: Number.NaN,
        allowedDropV,
        level: 'ok' as const,
      }
  const need = valid ? requiredSection({ currentA, lengthM, material, maxDropV: allowedDropV }) : Number.NaN
  const rec = valid ? recommendedSection(currentA) : null

  const color = r.level === 'ok' ? 'text-ok' : r.level === 'warn' ? 'text-warn' : 'text-bad'

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <Num label="Ток" value={currentA} onChange={setCurrentA} suffix="А" />
        <Num label="Длина линии" value={lengthM} onChange={setLengthM} suffix="м" />
        <Num label="Сечение" value={section} onChange={setSection} suffix="мм²" />
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Тип цепи</span>
          <select className={inputClass} value={norm} onChange={(e) => setNorm(e.target.value as DropNorm)}>
            {DROP_NORMS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label} — до {fmtShort(n.max)} В
              </option>
            ))}
          </select>
        </label>
        <MaterialSelect value={material} onChange={setMaterial} />
      </Card>

      <Card>
        <div className={`text-3xl font-semibold ${valid ? color : 'text-muted'}`}>{fmt(r.dropV)} В</div>
        {valid ? (
          <>
            <div className="mt-1 text-sm text-muted">
              На нагрузке {fmt(r.voltageAtLoad)} В · {fmt(r.dropPercent, 1)} % · норма{' '}
              {fmt(r.allowedDropV)} В
            </div>
            <div className="mt-2 text-sm">
              {r.level === 'ok' && 'В норме'}
              {r.level === 'warn' && 'Многовато: свет тускнеет, реле может не сработать'}
              {r.level === 'bad' && 'Плохо: нужен толще провод'}
            </div>
            {need <= section ? (
              <p className="mt-2 text-xs text-muted">
                Под норму хватает {fmt(need)} мм²
                {rec ? ` · по току ближайшее ${fmt(rec.section)} мм²` : ''}
              </p>
            ) : (
              <p className="mt-2 text-xs text-warn">
                Под норму нужно {fmt(need)} мм²
                {rec ? `, по току — ${fmt(rec.section)} мм²` : ''}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Заполни все поля — сечение должно быть больше нуля</p>
        )}
      </Card>
    </div>
  )
}

function SectionCalc() {
  const [currentA, setCurrentA] = useState(20)
  const [lengthM, setLengthM] = useState(3)
  const [maxDropV, setMaxDropV] = useState(0.5)
  const [material, setMaterial] = useState<Material>('copper')

  const valid =
    isNum(currentA) && isNum(lengthM) && isNum(maxDropV) && maxDropV > 0 && currentA >= 0 && lengthM >= 0

  const w = valid ? chooseWire({ currentA, lengthM, material, maxDropV }) : null

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <Num label="Ток потребителя" value={currentA} onChange={setCurrentA} suffix="А" />
        <Num label="Длина линии" value={lengthM} onChange={setLengthM} suffix="м" />
        <Num label="Допустимое падение" value={maxDropV} onChange={setMaxDropV} suffix="В" />
        <MaterialSelect value={material} onChange={setMaterial} />
      </Card>

      <Card>
        {w ? (
          <>
            <div className="text-sm text-muted">По падению напряжения</div>
            <div className="text-3xl font-semibold text-accent">{fmt(w.byDrop)} мм²</div>
            <div className="mt-3 text-sm text-muted">По нагреву провода</div>
            <div className="text-xl font-medium">
              {w.heatStandard ? `${fmtShort(w.heatStandard)} мм²` : 'ток выше таблицы'}
            </div>
            <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
              {w.section != null ? (
                <>
                  Брать <span className="font-semibold text-accent">{fmtShort(w.section)} мм²</span> (стандартное),
                  держит {fmtShort(ampsForSection(w.section))} А, предохранитель{' '}
                  <span className="font-semibold text-accent">
                    {w.fuse != null ? `${fmtShort(w.fuse)} А` : 'провод не держит'}
                  </span>
                </>
              ) : (
                'Расчётное сечение больше 50 мм² — раздели цепь или сократи длину'
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              Решает большее из двух: падение на длине или нагрев. Сечение округлено вверх до стандартного.
              Учти способ прокладки, температуру и жгут.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Заполни поля — допустимое падение должно быть больше нуля</p>
        )}
      </Card>
    </div>
  )
}

function LeakCalc() {
  const [batteryAh, setBatteryAh] = useState(60)
  const [leakMa, setLeakMa] = useState(40)

  const valid = isNum(batteryAh) && isNum(leakMa) && batteryAh > 0 && leakMa >= 0
  const r = valid ? leakageDrain(batteryAh, leakMa) : null
  const color = r?.level === 'ok' ? 'text-ok' : r?.level === 'warn' ? 'text-warn' : 'text-bad'

  const days = (h: number) => (isNum(h) ? fmt(h / 24, 1) : '∞')

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <Num label="Ёмкость АКБ" value={batteryAh} onChange={setBatteryAh} suffix="Ач" />
        <Num label="Ток утечки" value={leakMa} onChange={setLeakMa} suffix="мА" />
      </Card>

      <Card>
        {r ? (
          <>
            <div className={`text-2xl font-semibold ${color}`}>
              {leakMa <= 50 ? 'Утечка в норме' : leakMa <= 80 ? 'На границе' : 'Повышенная утечка'}
            </div>
            <div className="mt-1 text-sm text-muted">Норма: 20–50 мА (до 80 мА у некоторых авто)</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted">До 50 % (безопасно)</div>
                <div className="font-medium">{days(r.hoursToHalf)} дн</div>
              </div>
              <div>
                <div className="text-muted">До глубокого разряда</div>
                <div className="font-medium">{days(r.hoursToDead)} дн</div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Заполни ёмкость и ток утечки</p>
        )}
      </Card>
      <p className="text-xs text-muted">
        Замерять через 20–60 минут после постановки на охрану — машина должна «уснуть».
      </p>
    </div>
  )
}

function SocCalc() {
  const [volts, setVolts] = useState(12.6)

  const valid = isNum(volts) && volts > 0
  const soc = valid ? socFromVoltage(volts) : Number.NaN
  const color = !valid ? 'text-muted' : soc >= 70 ? 'text-ok' : soc >= 40 ? 'text-warn' : 'text-bad'

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <Num label="Напряжение покоя" value={volts} onChange={setVolts} suffix="В" />
      </Card>
      <Card>
        <div className={`text-3xl font-semibold ${color}`}>{valid ? `${soc} %` : '— %'}</div>
        <div className="mt-1 text-sm text-muted">Оценка заряда по НРЦ (свинцово-кислотный)</div>
        <p className="mt-3 text-xs text-muted">
          Мерить через 2–4 часа после нагрузки или заряда. На морозе и сразу после пуска значение врёт. Для AGM/EFB
          кривая немного другая — значение ориентировочное.
        </p>
      </Card>
    </div>
  )
}
