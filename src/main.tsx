import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { requestPersistence } from './data/db.ts'
import { ensureSeed } from './data/treeRepo.ts'
import { UpdateBanner } from './ui/UpdateBanner.tsx'

requestPersistence().catch(() => {})

// Деревья по умолчанию должны быть до первого рендера:
// иначе прямой заход на /#/run/no-start не найдёт дерево.
ensureSeed()
  .catch(() => {})
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
        <UpdateBanner />
      </StrictMode>,
    )
  })
