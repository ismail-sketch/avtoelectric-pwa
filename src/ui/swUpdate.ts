// Ручная проверка обновления service worker.
// В режиме autoUpdate updateServiceWorker() из vite-plugin-pwa не запрашивает
// проверку у сервера, поэтому дёргаем registration.update() сами.

export type UpdateCheck = 'updated' | 'none' | 'unsupported' | 'error'

export async function checkForUpdate(timeoutMs = 20000): Promise<UpdateCheck> {
  if (!('serviceWorker' in navigator)) return 'unsupported'

  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return 'unsupported'

  const sw = navigator.serviceWorker
  const before = sw.controller

  // Ловим смену контроллера заранее: новый SW с skipWaiting может
  // активироваться почти мгновенно, ещё внутри reg.update().
  let changed = false
  const onChange = () => {
    changed = true
  }
  sw.addEventListener('controllerchange', onChange)

  try {
    await reg.update()
  } catch {
    sw.removeEventListener('controllerchange', onChange)
    return 'error'
  }

  const pending = reg.installing ?? reg.waiting
  // Ждущий воркер имеет state 'installed'; будим его на активацию.
  if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })

  // Нового воркера нет и контроллер не сменился — обновлений нет.
  if (!pending && !changed && sw.controller === before) {
    sw.removeEventListener('controllerchange', onChange)
    return 'none'
  }

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (changed || sw.controller !== before) {
      sw.removeEventListener('controllerchange', onChange)
      return 'updated'
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  sw.removeEventListener('controllerchange', onChange)
  return 'error'
}