import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Home, Inbox, Lightbulb, LogOut, Plus, UserRound, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useInboxCount } from '../hooks/queries'
import { Avatar } from './Avatar'
import { ErrorBoundary } from './ErrorBoundary'
import { ConnectionProblem, Loading } from './states'

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="CR Dev Community, inicio">
      <span className="seal" aria-hidden="true">
        CR
      </span>
      <span>
        Dev Community
        <small>Taller de proyectos</small>
      </span>
    </Link>
  )
}

function PendingBadge() {
  const { data } = useInboxCount()
  const pending = data?.pending ?? 0
  if (pending === 0) return null
  return (
    <span className="badge" aria-label={`${pending} pendientes`}>
      {pending > 9 ? '9+' : pending}
    </span>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={user.name} src={user.avatarUrl} size={36} />
        <span className="user-menu__name">{user.name.split(' ')[0]}</span>
      </button>
      {open && (
        <div className="user-menu__panel glass glass--dense" role="menu">
          <Link role="menuitem" className="user-menu__item" to={`/people/${user.id}`}>
            <UserRound size={17} /> Mi perfil
          </Link>
          <Link role="menuitem" className="user-menu__item" to="/me/edit">
            <UserRound size={17} /> Editar perfil
          </Link>
          <button role="menuitem" type="button" className="user-menu__item" onClick={logout}>
            <LogOut size={17} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

function TopBar() {
  const { user } = useAuth()
  const location = useLocation()
  const linkClass = ({ isActive }: { isActive: boolean }) => `nav__link ${isActive ? 'is-active' : ''}`
  return (
    <div className="nav-wrap">
      <nav className="nav glass" aria-label="Principal">
        <Brand />
        {user && (
          <div className="nav__links">
            <NavLink to="/feed" className={linkClass}>
              <Home size={17} /> Inicio
            </NavLink>
            <NavLink to="/ideas" className={linkClass}>
              <Lightbulb size={17} /> Ideas
            </NavLink>
            <NavLink to="/people" className={linkClass}>
              <Users size={17} /> Personas
            </NavLink>
            <NavLink to="/inbox" className={linkClass}>
              <Inbox size={17} /> Bandeja <PendingBadge />
            </NavLink>
          </div>
        )}
        <span className="nav__spacer" />
        <div className="nav__actions">
          {user ? (
            <>
              <Link to="/projects/new" className="btn btn--primary btn-new">
                <Plus size={17} /> Nuevo proyecto
              </Link>
              {/* keyed by path so the menu closes itself whenever we navigate */}
              <UserMenu key={location.pathname} />
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost">
                Entrar
              </Link>
              <Link to="/register" className="btn btn--primary">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

function TabBar() {
  const { user } = useAuth()
  if (!user) return null
  const cls = ({ isActive }: { isActive: boolean }) => `tabbar__item ${isActive ? 'is-active' : ''}`
  return (
    <nav className="tabbar glass" aria-label="Navegación móvil">
      <NavLink to="/feed" className={cls}>
        <Home size={21} /> Inicio
      </NavLink>
      <NavLink to="/ideas" className={cls}>
        <Lightbulb size={21} /> Ideas
      </NavLink>
      <Link to="/projects/new" className="tabbar__item tabbar__item--new" aria-label="Nuevo proyecto">
        <Plus size={26} />
      </Link>
      <NavLink to="/people" className={cls}>
        <Users size={21} /> Personas
      </NavLink>
      <NavLink to="/inbox" className={cls}>
        <Inbox size={21} /> Bandeja <PendingBadge />
      </NavLink>
    </nav>
  )
}

export function AppLayout() {
  const location = useLocation()
  // Block body on purpose: newer browsers return a Promise from scrollTo, and an effect
  // must never return anything but a cleanup function.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="app">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <div className="ambient" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <TopBar />
      <main id="contenido" className="page-shell">
        {/* keyed by path: a crash in one screen is cleared as soon as you navigate elsewhere */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <div className="ornament" aria-hidden="true">
          ✦
        </div>
        <p>CR Dev Community · Hecho a mano para quienes construyen cosas juntos.</p>
      </footer>
      <TabBar />
    </div>
  )
}

/** Wraps the pages that need a session; sends visitors to log in and brings them back afterwards. */
export function RequireAuth() {
  const { user, ready, offline, retry } = useAuth()
  const location = useLocation()
  if (!ready) return <Loading label="Entrando…" />
  if (offline) return <ConnectionProblem onRetry={retry} />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
