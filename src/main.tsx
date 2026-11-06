import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { requestPersistence } from './data/db.ts'
import { ensureSeed } from './data/treeRepo.ts'
import { withTimeout } from './data/withTimeout.ts'
import { ErrorBoundary } from './ui/ErrorBoundary.tsx'
import { UpdateBanner } from './ui/UpdateBanner.tsx'

requestPersistence().catch(() => {})

// Деревья по умолчанию должны быть до первого рендера:
// иначе прямой заход на /#/run/no-start не найдёт дерево.
// Если IndexedDB подвисла — не держим белый экран, рендерим через 5 секунд.
withTimeout(ensureSeed(), 5000, 'База не отвечает')
  .catch(() => {})
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
          <UpdateBanner />
        </ErrorBoundary>
      </StrictMode>,
    )
  })