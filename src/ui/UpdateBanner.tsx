import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { APP_VERSION } from '../version'
import { checkForUpdate } from './swUpdate'

/**
 * Обновления.
 *
 * SW активируется сам (skipWaiting + clientsClaim), Workbox вызывает
 * onNeedReload перед перезагрузкой. Флаг в sessionStorage ставим без версии:
 * перезагрузка идёт уже в новой сборке, и APP_VERSION там новый.
 */

type Notice = 'updated' | 'offline' | 'none' | 'error'

export function UpdateBanner() {
  const [notice, setNotice] = useState<Notice | null>(() =>
    sessionStorage.getItem('avtoelectric-updated') === '1' ? 'updated' : null,
  )

  useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => registration.update().catch(() => {})
      // Браузер сам проверяет обновление редко (до 24 ч).
      // Проверяем при каждом запуске, при возврате в фокус и раз в 5 минут.
      setTimeout(check, 1500)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, 5 * 60_000)
    },
    onNeedReload() {
      // Флаг переживёт перезагрузку, версию подставим уже из новой сборки.
      // Workbox при наличии onNeedReload сам не перезагружает — делаем это здесь.
      sessionStorage.setItem('avtoelectric-updated', '1')
      window.location.reload()
    },
    onOfflineReady() {
      setNotice('offline')
    },
  })

  useEffect(() => {
    if (notice !== 'updated') return
    sessionStorage.removeItem('avtoelectric-updated')
  }, [notice])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  // Ручная проверка из настроек.
  useEffect(() => {
    const handler = async () => {
      const result = await checkForUpdate()
      if (result === 'none') setNotice('none')
      else if (result === 'error' || result === 'unsupported') setNotice('error')
      // 'updated' — страница перезагрузится сама через onNeedReload.
    }
    window.addEventListener('avtoelectric:check-update', handler)
    return () => window.removeEventListener('avtoelectric:check-update', handler)
  }, [])

  if (!notice) return null

  const text =
    notice === 'updated'
      ? `Обновлено до версии ${APP_VERSION}`
      : notice === 'offline'
        ? 'Готово к работе офлайн'
        : notice === 'none'
          ? 'Уже последняя версия'
          : 'Не удалось проверить обновление'

  const tone =
    notice === 'none'
      ? 'border-line text-muted'
      : notice === 'error'
        ? 'border-warn/40 text-warn'
        : 'border-ok/40 text-ok'

  return (
    <div
      className={`fixed inset-x-3 bottom-20 z-50 rounded-xl border bg-surface px-4 py-3 text-center text-sm no-print ${tone}`}
    >
      {text}
    </div>
  )
}