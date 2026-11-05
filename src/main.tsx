import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { requestPersistence } from './data/db.ts'
import { ensureSeed } from './data/treeRepo.ts'

// Обновление не перезагружает страницу посреди диагностики — только по кнопке.
registerSW({
  immediate: true,
  onNeedRefresh() {
    const banner = document.createElement('button')
    banner.textContent = 'Доступно обновление — нажми, чтобы применить'
    banner.style.cssText = [
      'position:fixed', 'left:12px', 'right:12px', 'bottom:76px', 'z-index:50',
      'padding:12px', 'border-radius:12px', 'border:1px solid #22303d',
      'background:#18232e', 'color:#e8eff7', 'font:14px system-ui', 'text-align:center',
    ].join(';')
    banner.onclick = () => window.location.reload()
    document.body.appendChild(banner)
  },
})

requestPersistence().catch(() => {})

// Деревья по умолчанию должны быть до первого рендера:
// иначе прямой заход на /#/run/no-start не найдёт дерево.
ensureSeed()
  .catch(() => {})
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
