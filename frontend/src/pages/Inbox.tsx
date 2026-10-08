import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Inbox as InboxIcon, X } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { SkillChips } from '../components/SkillChips'
import { EmptyState, ErrorNote, Loading } from '../components/states'
import { useToast } from '../components/Toast'
import { useFriendActions, useInbox } from '../hooks/queries'
import { api } from '../lib/api'
import { REQUEST_STATUS_LABEL, timeAgo } from '../lib/format'

export default function InboxPage() {
  const { data, isLoading, error, refetch } = useInbox()
  const friends = useFriendActions()
  const client = useQueryClient()
  const toast = useToast()

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) => api.post(`/api/join-requests/${id}/${action}`),
    onSuccess: (_, v) => {
      for (const key of ['inbox', 'inbox-count', 'project', 'projects']) void client.invalidateQueries({ queryKey: [key] })
      toast.success(v.action === 'accept' ? 'Se sumó al equipo.' : 'Solicitud rechazada.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <Loading />
  if (error || !data) {
    return (
      <div className="page page--narrow">
        <ErrorNote error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const nothing = data.friendRequests.length === 0 && data.received.length === 0 && data.sent.length === 0

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <p className="eyebrow">Bandeja</p>
        <h1>Lo que espera tu respuesta</h1>
        <hr className="rule" />
      </header>

      {nothing ? (
        <EmptyState icon={<InboxIcon size={26} />} title="Todo al día">
          <p>
            Cuando alguien quiera unirse a uno de tus proyectos o agregarte como amigo, lo verás aquí. Mientras, explora
            el <Link to="/feed">tablero</Link>.
          </p>
        </EmptyState>
      ) : (
        <>
          {data.friendRequests.length > 0 && (
            <section className="section" aria-labelledby="amistad">
              <div className="section__head">
                <h2 id="amistad">Solicitudes de amistad</h2>
                <span className="badge">{data.friendRequests.length}</span>
              </div>
              <ul className="stack stack--sm">
                {data.friendRequests.map((r) => (
                  <li key={r.id} className="request glass glass--quiet request--row">
                    <Link to={`/people/${r.user.id}`} className="byline">
                      <Avatar name={r.user.name} src={r.user.avatarUrl} size={46} />
                      <span>
                        <strong>{r.user.name}</strong>
                        <small className="faint">{r.user.headline ?? 'Quiere agregarte como amigo'} · {timeAgo(r.createdAt)}</small>
                      </span>
                    </Link>
                    <div className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                      <button type="button" className="btn btn--ghost btn--sm" disabled={friends.decline.isPending} onClick={() => friends.decline.mutate(r.id)}>
                        <X size={15} /> Rechazar
                      </button>
                      <button type="button" className="btn btn--primary btn--sm" disabled={friends.accept.isPending} onClick={() => friends.accept.mutate(r.id)}>
                        <Check size={15} /> Aceptar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.received.length > 0 && (
            <section className="section" aria-labelledby="unirse">
              <div className="section__head">
                <h2 id="unirse">Quieren unirse a tus proyectos</h2>
                <span className="badge">{data.received.length}</span>
              </div>
              <ul className="stack stack--sm">
                {data.received.map((r) => (
                  <li key={r.id} className="request glass glass--quiet">
                    <div>
                      <Link to={`/people/${r.applicant.id}`} className="byline">
                        <Avatar name={r.applicant.name} src={r.applicant.avatarUrl} size={46} />
                        <strong>{r.applicant.name}</strong>
                      </Link>
                      <small className="faint" style={{ display: 'block', marginTop: '0.2rem' }}>
                        {r.roleTitle ? `Quiere el puesto de ${r.roleTitle}` : 'Quiere ayudar'} en{' '}
                        <Link to={`/projects/${r.projectId}`}>{r.projectTitle}</Link> · {timeAgo(r.createdAt)}
                      </small>
                    </div>
                    <p className="request__msg">“{r.message}”</p>
                    <SkillChips skills={r.applicantSkills} limit={8} />
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
          )}

          {data.sent.length > 0 && (
            <section className="section" aria-labelledby="enviadas">
              <div className="section__head">
                <h2 id="enviadas">Tus solicitudes</h2>
              </div>
              <ul className="stack stack--sm">
                {data.sent.map((r) => (
                  <li key={r.id} className="request glass glass--quiet request--row">
                    <span>
                      <Link to={`/projects/${r.projectId}`}>
                        <strong>{r.projectTitle}</strong>
                      </Link>
                      <small className="faint" style={{ display: 'block' }}>
                        {r.roleTitle ? `Puesto: ${r.roleTitle}` : 'Ayuda en general'} · {timeAgo(r.createdAt)}
                      </small>
                    </span>
                    <span className={`chip ${r.status === 'Accepted' ? 'chip--open' : r.status === 'Pending' ? 'chip--match' : ''}`}>
                      {REQUEST_STATUS_LABEL[r.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
