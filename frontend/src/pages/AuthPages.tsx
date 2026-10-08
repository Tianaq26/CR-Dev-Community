import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEMO_LOGIN === 'true'

function useRedirect() {
  const location = useLocation()
  return (location.state as { from?: string } | null)?.from ?? '/feed'
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = useRedirect()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  async function attempt(e: string, p: string) {
    setError(null)
    setBusy(true)
    try {
      await login(e, p)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void attempt(email, password)
  }

  return (
    <div className="page page--narrow auth">
      <div className="auth__card glass glass--dense">
        <p className="eyebrow">Bienvenida de vuelta</p>
        <h1>Entrar</h1>
        <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: '1.4rem' }}>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <label className="field">
            <span className="field__label">Correo</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Contraseña</span>
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {DEMO_ENABLED && (
          <div className="auth__demo">
            <div className="ornament" aria-hidden="true">
              o
            </div>
            <button type="button" className="btn btn--glass btn--block" disabled={busy} onClick={() => void attempt('demo@crdev.community', 'demo1234')}>
              Mirar con la cuenta de demostración
            </button>
          </div>
        )}

        <p className="auth__alt">
          ¿Aún no tienes cuenta? <Link to="/register">Crea una</Link>
        </p>
      </div>
    </div>
  )
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user && !busy) return <Navigate to="/feed" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await register(name, email, password)
      // New accounts start by filling in the profile: skills are what make matching work.
      navigate('/me/edit?welcome=1', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow auth">
      <div className="auth__card glass glass--dense">
        <p className="eyebrow">Únete a la comunidad</p>
        <h1>Crear cuenta</h1>
        <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: '1.4rem' }}>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <label className="field">
            <span className="field__label">Nombre</span>
            <input className="input" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Correo</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Contraseña</span>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="field__hint">Mínimo 8 caracteres.</span>
          </label>
          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? 'Creando…' : 'Crear mi cuenta'}
          </button>
        </form>
        <p className="auth__alt">
          ¿Ya tienes cuenta? <Link to="/login">Entra aquí</Link>
        </p>
      </div>
    </div>
  )
}
