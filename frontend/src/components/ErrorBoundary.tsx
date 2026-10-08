import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Catches render errors so a bug in one screen shows a message instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page page--narrow">
        <div className="empty glass glass--dense" role="alert">
          <p className="eyebrow">Algo salió mal</p>
          <h1>Esta pantalla tuvo un problema.</h1>
          <p className="muted">
            No perdiste nada de lo guardado. Prueba a recargar la página; si vuelve a pasar, cuéntanos qué estabas
            haciendo.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: '0.8rem' }}>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Recargar
            </button>
            <a className="btn btn--glass" href="/">
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }
}
