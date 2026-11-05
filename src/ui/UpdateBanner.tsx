import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { APP_VERSION } from '../version'

/**
 * Обновления.
 *
 * Раньше был режим "prompt": новый service worker вставал в ожидание,
 * а кнопка делала просто location.reload(). Старый SW продолжал отдавать
 * старый index.html из кэша — плашка появлялась снова. Замкнутый круг.
 *
 * Теперь SW активируется сам (skipWaiting + clientsClaim), а страница
 * перезагружается по controllerchange. Данные не теряются: журнал в
 * IndexedDB, текущее прохождение — в localStorage.
 */
export function UpdateBanner() {
  const [offlineReady, setOfflineReady] = useState(false)
  const [updated, setUpdated] = useState(() => sessionStorage.getItem('avtoelectric-updated') === APP_VERSION)
  const hadController = useRef(false)

  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => registration.update().catch(() => {})
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, 5 * 60_000)
    },
    onOfflineReady() {
      setOfflineReady(true)
    },
  })

  // Запоминаем, был ли SW до этого: при первой установке перезагружаться не нужно.
  useEffect(() => {
    hadController.current = Boolean(navigator.serviceWorker?.controller)
  }, [])

  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw) return
    let reloading = false

    const onControllerChange = () => {
      if (reloading) return
      if (!hadController.current) {
        // Первая установка: новый SW просто взял управление, перезагрузка не нужна.
        hadController.current = true
        return
      }
      reloading = true
      sessionStorage.setItem('avtoelectric-updated', APP_VERSION)
      window.location.reload()
    }

    sw.addEventListener('controllerchange', onControllerChange)
    return () => sw.removeEventListener('controllerchange', onControllerChange)
  }, [])

  useEffect(() => {
    if (!updated) return
    sessionStorage.removeItem('avtoelectric-updated')
    const t = setTimeout(() => setUpdated(false), 4000)
    return () => clearTimeout(t)
  }, [updated])

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(t)
  }, [offlineReady])

  // Ручная проверка из настроек.
  useEffect(() => {
    const handler = () => updateServiceWorker(true)
    window.addEventListener('avtoelectric:check-update', handler)
    return () => window.removeEventListener('avtoelectric:check-update', handler)
  }, [updateServiceWorker])

  if (updated) {
    return (
      <div className="fixed inset-x-3 bottom-20 z-50 rounded-xl border border-ok/40 bg-surface px-4 py-3 text-center text-sm text-ok no-print">
        Обновлено до версии {APP_VERSION}
      </div>
    )
  }

  if (offlineReady) {
    return (
      <div className="fixed inset-x-3 bottom-20 z-50 rounded-xl border border-ok/40 bg-surface px-4 py-3 text-center text-sm text-ok no-print">
        Готово к работе офлайн
      </div>
    )
  }

  return null
}
