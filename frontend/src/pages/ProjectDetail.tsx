import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ExternalLink, Link2, Pencil, Send, Sparkles, Trash2, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { MediaGallery } from '../components/MediaGallery'
import { Modal } from '../components/Modal'
import { RelationshipButton } from '../components/RelationshipButton'
import { ShareButton } from '../components/ShareButton'
import { SkillChips } from '../components/SkillChips'
import { StatusStamp } from '../components/Cards'
import { ErrorNote, Loading } from '../components/states'
import { useToast } from '../components/Toast'
import { useProject, useProjectRequests, useProjectSuggestions } from '../hooks/queries'
import { api, ApiError } from '../lib/api'
import { fullDate, timeAgo } from '../lib/format'
import type { MyApplication, ProjectDetail, RoleView } from '../lib/types'

function useProjectRefresh(id: string) {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ['project', id] })
    void client.invalidateQueries({ queryKey: ['inbox'] })
    void client.invalidateQueries({ queryKey: ['inbox-count'] })
    void client.invalidateQueries({ queryKey: ['projects'] })
  }
}

function ApplyModal({ project, initialRoleId, onClose }: { project: ProjectDetail; initialRoleId: string | null; onClose: () => void }) {
  const toast = useToast()
  const refresh = useProjectRefresh(project.id)
  const openRoles = project.roles.filter((r) => r.isOpen)
  const [roleId, setRoleId] = useState(initialRoleId ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () =>
      api.post<MyApplication>(`/api/projects/${project.id}/apply`, { roleId: roleId || null, message }),
    onSuccess: () => {
      refresh()
      toast.success('Solicitud enviada. Te avisaremos en tu bandeja cuando respondan.')
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    send.mutate()
  }

  return (
    <Modal title="Quiero unirme" onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit}>
        <p className="muted">
          Le llegará tu solicitud a <strong>{project.owner.name}</strong>. Cuéntale qué puedes aportar.
        </p>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {openRoles.length > 0 && (
          <label className="field">
            <span className="field__label">Puesto</span>
            <select className="select" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">Cualquiera / quiero ayudar en general</option>
              {openRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span className="field__label">Tu mensaje</span>
          <textarea
            className="textarea"
            required
            minLength={5}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hola, me interesa el proyecto porque… Puedo aportar…"
          />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn--primary" disabled={send.isPending}>
            <Send size={16} /> {send.isPending ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RoleItem({ role, canApply, onApply }: { role: RoleView; canApply: boolean; onApply: () => void }) {
  return (
    <li className={`role glass glass--quiet ${role.isMatch ? 'role--match' : ''} ${role.isOpen ? '' : 'role--closed'}`}>
      <div className="role__main">
        <div className="row" style={{ gap: '0.5rem' }}>
          <h3>{role.title}</h3>
          {role.title.toLowerCase() !== role.skill.toLowerCase() && <span className="chip">{role.skill}</span>}
          {role.isMatch && (
            <span className="chip chip--match">
              <Sparkles size={13} /> Encaja contigo
            </span>
          )}
        </div>
        {role.description && <p className="muted">{role.description}</p>}
      </div>
      <div className="role__side">
        {role.isOpen ? (
          canApply ? (
            <button type="button" className={`btn ${role.isMatch ? 'btn--primary' : 'btn--glass'} btn--sm`} onClick={onApply}>
              Quiero este puesto
            </button>
          ) : (
            <span className="chip chip--open">Abierto</span>
          )
        ) : (
          <span className="chip chip--closed">Cubierto</span>
        )}
      </div>
    </li>
  )
}

function OwnerRequests({ project }: { project: ProjectDetail }) {
  const toast = useToast()
  const refresh = useProjectRefresh(project.id)
  const { data: requests } = useProjectRequests(project.id, true)
  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) => api.post(`/api/join-requests/${id}/${action}`),
    onSuccess: (_, v) => {
      refresh()
      toast.success(v.action === 'accept' ? 'Se sumó al equipo.' : 'Solicitud rechazada.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!requests || requests.length === 0) return null
  return (
    <section className="section" aria-labelledby="solicitudes">
      <div className="section__head">
        <h2 id="solicitudes">Solicitudes para unirse</h2>
        <span className="badge">{requests.length}</span>
      </div>
      <ul className="stack stack--sm">
        {requests.map((r) => (
          <li key={r.id} className="request glass glass--quiet">
            <Link to={`/people/${r.applicant.id}`} className="byline">
              <Avatar name={r.applicant.name} src={r.applicant.avatarUrl} size={44} />
              <span>
                <strong>{r.applicant.name}</strong>
                <small className="faint">
                  {r.roleTitle ? `Quiere el puesto de ${r.roleTitle}` : 'Quiere ayudar en general'} · {timeAgo(r.createdAt)}
                </small>
              </span>
            </Link>
            <p className="request__msg">“{r.message}”</p>
            <SkillChips skills={r.applicantSkills} highlightMine={false} limit={8} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--ghost btn--sm" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, action: 'decline' })}>
                <X size={15} /> Rechazar
              </button>
              <button type="button" className="btn btn--primary btn--sm" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, action: 'accept' })}>
                <Check size={15} /> Aceptar en el equipo
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function OwnerSuggestions({ project }: { project: ProjectDetail }) {
  const { data } = useProjectSuggestions(project.id, true)
  const withPeople = (data ?? []).filter((s) => s.people.length > 0)
  if (withPeople.length === 0) return null
  return (
    <section className="section" aria-labelledby="sugeridas">
      <div className="section__head">
        <h2 id="sugeridas">Personas que encajan</h2>
      </div>
      <p className="muted">Estas personas tienen la habilidad que buscas. Escríbeles o agrégalas como amigas.</p>
      {withPeople.map((s) => (
        <div key={s.roleId} className="stack stack--sm">
          <h3 className="label-lg">{s.roleTitle}</h3>
          <ul className="suggest-grid">
            {s.people.map((p) => (
              <li key={p.id} className="glass glass--quiet suggest">
                <Link to={`/people/${p.id}`} className="byline">
                  <Avatar name={p.name} src={p.avatarUrl} size={40} />
                  <span>
                    <strong>{p.name}</strong>
                    <small className="faint">{p.headline ?? p.location}</small>
                  </span>
                </Link>
                <RelationshipButton userId={p.id} userName={p.name} relationship={p.relationship} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: project, isLoading, error, refetch } = useProject(id)
  const refresh = useProjectRefresh(id)
  const [applyFor, setApplyFor] = useState<{ roleId: string | null } | null>(null)

  const client = useQueryClient()
  const remove = useMutation({
    mutationFn: () => api.del(`/api/projects/${id}`),
    onSuccess: () => {
      // Drop the deleted project from the cache instead of refetching it (that would 404 while we leave the page).
      client.removeQueries({ queryKey: ['project', id] })
      void client.invalidateQueries({ queryKey: ['projects'] })
      void client.invalidateQueries({ queryKey: ['inbox'] })
      void client.invalidateQueries({ queryKey: ['inbox-count'] })
      toast.success('Proyecto eliminado.')
      navigate('/feed', { replace: true })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancel = useMutation({
    mutationFn: (requestId: string) => api.del(`/api/join-requests/${requestId}`),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.del(`/api/projects/${id}/members/${userId}`),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <Loading />
  if (error || !project) {
    return (
      <div className="page page--narrow">
        <ErrorNote error={error instanceof ApiError && error.status === 404 ? new Error('Este proyecto no existe o fue eliminado.') : error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const app = project.myApplication
  const canApply = !project.isOwner && !project.isMember && app?.status !== 'Pending'
  const hasOpenRoles = project.roles.some((r) => r.isOpen)
  const pageTitle = project.title

  return (
    <div className="page">
      <title>{`${pageTitle} · CR Dev Community`}</title>
      <Link to="/feed" className="back">
        <ArrowLeft size={16} /> Volver al tablero
      </Link>

      <header className="project-head glass">
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <StatusStamp status={project.status} />
          <div className="row" style={{ gap: '0.5rem' }}>
            <ShareButton path={`/projects/${project.id}`} title={project.title} text={project.summary} />
            {project.isOwner && (
              <>
                <Link to={`/projects/${project.id}/edit`} className="btn btn--glass btn--sm">
                  <Pencil size={15} /> Editar
                </Link>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  disabled={remove.isPending}
                  onClick={() => window.confirm('¿Eliminar este proyecto? Se borrarán también sus solicitudes. No se puede deshacer.') && remove.mutate()}
                >
                  <Trash2 size={15} /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>
        <h1>{project.title}</h1>
        <p className="lede">{project.summary}</p>
        <div className="row row--between project-head__foot">
          <Link to={`/people/${project.owner.id}`} className="byline">
            <Avatar name={project.owner.name} src={project.owner.avatarUrl} size={42} />
            <span>
              <strong>{project.owner.name}</strong>
              <small className="faint">Publicado {timeAgo(project.createdAt)}</small>
            </span>
          </Link>

          {!project.isOwner && (
            <div className="row" style={{ gap: '0.6rem' }}>
              {project.isMember && <span className="chip chip--open">Eres parte del equipo</span>}
              {app?.status === 'Pending' && (
                <>
                  <span className="chip chip--match">Solicitud enviada</span>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={cancel.isPending} onClick={() => cancel.mutate(app.id)}>
                    Cancelar
                  </button>
                </>
              )}
              {app?.status === 'Declined' && !project.isMember && <span className="chip">Tu última solicitud no fue aceptada</span>}
              {canApply && hasOpenRoles && (
                <button type="button" className="btn btn--primary" onClick={() => setApplyFor({ roleId: null })}>
                  <Send size={16} /> Quiero unirme
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="detail-layout">
        <div className="stack" style={{ gap: '2rem' }}>
          {project.media.length > 0 && <MediaGallery media={project.media} title={project.title} />}

          {project.description && (
            <section className="section" aria-labelledby="sobre">
              <h2 id="sobre">Sobre el proyecto</h2>
              <div className="prose">{project.description}</div>
            </section>
          )}

          <section className="section" aria-labelledby="buscamos">
            <h2 id="buscamos">A quién se busca</h2>
            {project.roles.length === 0 ? (
              <p className="muted">Este proyecto todavía no tiene puestos abiertos.</p>
            ) : (
              <ul className="stack stack--sm">
                {project.roles.map((r) => (
                  <RoleItem key={r.id} role={r} canApply={canApply} onApply={() => setApplyFor({ roleId: r.id })} />
                ))}
              </ul>
            )}
          </section>

          {project.isOwner && <OwnerRequests project={project} />}
          {project.isOwner && <OwnerSuggestions project={project} />}
        </div>

        <aside className="stack detail-aside">
          <section className="glass glass--quiet aside-card">
            <h3>Equipo</h3>
            <ul className="team">
              <li>
                <Link to={`/people/${project.owner.id}`} className="byline">
                  <Avatar name={project.owner.name} src={project.owner.avatarUrl} size={36} />
                  <span>
                    <strong>{project.owner.name}</strong>
                    <small className="faint">Creación del proyecto</small>
                  </span>
                </Link>
              </li>
              {project.members.map((m) => (
                <li key={m.user.id}>
                  <Link to={`/people/${m.user.id}`} className="byline">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} size={36} />
                    <span>
                      <strong>{m.user.name}</strong>
                      <small className="faint">{m.roleTitle}</small>
                    </span>
                  </Link>
                  {(project.isOwner || m.user.id === user?.id) && (
                    <button
                      type="button"
                      className="icon-btn"
                      title={m.user.id === user?.id ? 'Salir del proyecto' : `Quitar a ${m.user.name}`}
                      aria-label={m.user.id === user?.id ? 'Salir del proyecto' : `Quitar a ${m.user.name}`}
                      onClick={() => window.confirm('¿Seguro?') && removeMember.mutate(m.user.id)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {(project.repoUrl || project.demoUrl) && (
            <section className="glass glass--quiet aside-card">
              <h3>Enlaces</h3>
              <ul className="links">
                {project.demoUrl && (
                  <li>
                    <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={15} /> Ver la demo
                    </a>
                  </li>
                )}
                {project.repoUrl && (
                  <li>
                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                      <Link2 size={15} /> Repositorio
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}

          <p className="faint small">Publicado el {fullDate(project.createdAt)}</p>
        </aside>
      </div>

      {applyFor && <ApplyModal project={project} initialRoleId={applyFor.roleId} onClose={() => setApplyFor(null)} />}
    </div>
  )
}
