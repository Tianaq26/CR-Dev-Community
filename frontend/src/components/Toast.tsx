import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'

interface ToastItem {
  id: number
  kind: 'success' | 'error'
  text: string
}

interface ToastApi {
  success: (text: string) => void
  error: (text: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const push = useCallback((kind: ToastItem['kind'], text: string) => {
    const id = nextId.current++
    setItems((current) => [...current.slice(-2), { id, kind, text }])
    window.setTimeout(() => setItems((current) => current.filter((t) => t.id !== id)), kind === 'error' ? 6500 : 3800)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({ success: (t) => push('success', t), error: (t) => push('error', t) }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast glass glass--dense ${t.kind === 'error' ? 'toast--error' : ''}`}>
            <span className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              {t.kind === 'error' ? <CircleAlert size={18} style={{ marginTop: 3, flex: 'none' }} /> : <CheckCircle2 size={18} style={{ marginTop: 3, flex: 'none', color: 'var(--moss-600)' }} />}
              <span>{t.text}</span>
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
