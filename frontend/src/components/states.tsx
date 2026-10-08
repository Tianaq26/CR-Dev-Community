import { useEffect, useState, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  // Free hosting puts the server to sleep when idle; waking it can take close to a minute.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 4000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="loading" role="status">
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      {slow && (
        <p className="loading__slow muted small">
          Estamos despertando el servidor. Si acaba de estar inactivo, puede tardar hasta un minuto la primera vez.
        </p>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty glass glass--quiet">
      {icon && <div className="empty__icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <div className="empty__body">{children}</div>}
    </div>
  )
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Algo salió mal.'
  return (
    <div className="empty glass glass--quiet" role="alert">
      <div className="empty__icon">
        <CircleAlert size={26} />
      </div>
      <h3>No pudimos cargar esto</h3>
      <div className="empty__body">
        <p>{message}</p>
        {onRetry && (
          <button type="button" className="btn btn--glass btn--sm" onClick={onRetry}>
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}

export function LoadMore({ hasMore, loading, onClick }: { hasMore: boolean; loading: boolean; onClick: () => void }) {
  if (!hasMore) return null
  return (
    <div className="row" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
      <button type="button" className="btn btn--glass" onClick={onClick} disabled={loading}>
        {loading ? 'Cargando…' : 'Ver más'}
      </button>
    </div>
  )
}
