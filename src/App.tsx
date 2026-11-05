import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { DiagnoseScreen } from './screens/DiagnoseScreen'
import { RunScreen } from './screens/RunScreen'
import { CalcScreen } from './screens/CalcScreen'
import { JournalScreen } from './screens/JournalScreen'
import { CarScreen } from './screens/CarScreen'
import { GapsScreen } from './screens/GapsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { WorkScreen } from './screens/WorkScreen'

const tabs = [
  { to: '/', label: 'Главная', icon: '⌂', end: true },
  { to: '/diagnose', label: 'Диагностика', icon: '⌁' },
  { to: '/calc', label: 'Расчёты', icon: '±' },
  { to: '/journal', label: 'Журнал', icon: '▤' },
]

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur safe-bottom no-print">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/diagnose" element={<DiagnoseScreen />} />
        <Route path="/run/:slug" element={<RunScreen />} />
        <Route path="/calc" element={<CalcScreen />} />
        <Route path="/journal" element={<JournalScreen />} />
        <Route path="/car/:id" element={<CarScreen />} />
        <Route path="/work/:id" element={<WorkScreen />} />
        <Route path="/gaps" element={<GapsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <BottomNav />
    </HashRouter>
  )
}
