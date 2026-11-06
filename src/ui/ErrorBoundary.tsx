import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Ловит ошибки рендера. Без него любая ошибка в экране гасит всё приложение
 * до перезагрузки — именно так выглядит «пустой экран».
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
          <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
          <p className="text-sm text-muted">
            Данные не потеряны. Перезагрузи приложение — если ошибка повторяется, пришли текст ниже.
          </p>
          <pre className="overflow-auto rounded-xl border border-line bg-surface-2 p-3 text-xs text-bad">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-ink"
          >
            Перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}