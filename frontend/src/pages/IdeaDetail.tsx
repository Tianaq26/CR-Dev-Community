import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Hammer, HandHeart, Heart, MessageCircle, Pencil, Send, Trash2 } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { IdeaForm } from '../components/IdeaForm'
import { ShareButton } from '../components/ShareButton'
import { SkillChips } from '../components/SkillChips'
import { ErrorNote, Loading } from '../components/states'
import { useToast } from '../components/Toast'
import { useIdea } from '../hooks/queries'
import { api, ApiError } from '../lib/api'
import { COMMENT_KIND_LABEL, timeAgo } from '../lib/format'
import type { CommentKind, CommentView, IdeaDetail, InterestState } from '../lib/types'

export default function IdeaDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const toast = useToast()
  const { data: idea, isLoading, error, refetch } = useIdea(id)
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [kind, setKind] = useState<CommentKind>('Feedback')
  const [text, setText] = useState('')

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['idea', id] })
    void client.invalidateQueries({ queryKey: ['ideas'] })
  }
  const onError = (e: Error) => toast.error(e.message)

  const interest = useMutation({
    mutationFn: () => (idea?.interested ? api.del<InterestState>(`/api/ideas/${id}/interest`) : api.put<InterestState>(`/api/ideas/${id}/interest`)),
    onSuccess: refresh,
    onError,
  })

  const update = useMutation({
    mutationFn: (v: { title: string; body: string; tags: string[] }) => api.put<IdeaDetail>(`/api/ideas/${id}`, v),
    onSuccess: () => {
      refresh()
      setEditing(false)
      toast.success('Idea actualizada.')
    },
    onError: (e: Error) => setEditError(e.message),
  })

  const remove = useMutation({
    mutationFn: () => api.del(`/api/ideas/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['ideas'] })
      toast.success('Idea eliminada.')
      navigate('/ideas', { replace: true })
    },
    onError,
  })

  const comment = useMutation({
    mutationFn: () => api.post<CommentView>(`/api/ideas/${id}/comments`, { kind, body: text }),
    onSuccess: () => {
      setText('')
      refresh()
      toast.success(kind === 'Help' ? 'Avisamos a quien publicó la idea que quieres ayudar.' : 'Gracias por tu feedback.')
    },
    onError,
  })

  const removeComment = useMutation({
    mutationFn: (commentId: string) => api.del(`/api/ideas/${id}/comments/${commentId}`),
    onSuccess: refresh,
    onError,
  })

  if (isLoading) return <Loading />
  if (error || !idea) {
    return (
      <div className="page page--narrow">
        <ErrorNote error={error instanceof ApiError && error.status === 404 ? new Error('Esta idea no existe o fue eliminada.') : error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const helpers = idea.comments.filter((c) => c.kind === 'Help')

  function submitComment(e: FormEvent) {
    e.preventDefault()
    comment.mutate()
  }

  return (
    <div className="page page--narrow">
      <title>{`${idea.title} · CR Dev Community`}</title>
      <Link to="/ideas" className="back">
        <ArrowLeft size={16} /> Volver a las ideas
      </Link>

      <article className="glass idea-main">
        {editing ? (
          <>
            <h2>Editar idea</h2>
            <IdeaForm
              initial={{ title: idea.title, body: idea.body, tags: idea.tags }}
              submitLabel="Guardar cambios"
              busy={update.isPending}
              error={editError}
              onSubmit={(v) => {
                setEditError(null)
                update.mutate(v)
              }}
              onCancel={() => setEditing(false)}
            />
          </>
        ) : (
          <>
            <header className="row row--between" style={{ alignItems: 'flex-start' }}>
              <Link to={`/people/${idea.author.id}`} className="byline">
                <Avatar name={idea.author.name} src={idea.author.avatarUrl} size={44} />
                <span>
                  <strong>{idea.author.name}</strong>
                  <small className="faint">{timeAgo(idea.createdAt)}</small>
                </span>
              </Link>
              {idea.isOwner && (
                <div className="row" style={{ gap: '0.5rem' }}>
                  <button type="button" className="btn btn--glass btn--sm" onClick={() => setEditing(true)}>
                    <Pencil size={15} /> Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    disabled={remove.isPending}
                    onClick={() => window.confirm('¿Eliminar esta idea y su conversación?') && remove.mutate()}
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              )}
            </header>

            <h1>{idea.title}</h1>
            <div className="prose">{idea.body}</div>

            {idea.tags.length > 0 && (
              <div className="stack stack--sm">
                <span className="label-sm">Habilidades que podrían hacer falta</span>
                <SkillChips skills={idea.tags} highlightMine />
              </div>
            )}

            <footer className="row row--between idea-main__foot">
              <button type="button" className={`pill-btn ${idea.interested ? 'is-on' : ''}`} aria-pressed={idea.interested} onClick={() => interest.mutate()} disabled={interest.isPending}>
                <Heart size={16} fill={idea.interested ? 'currentColor' : 'none'} /> Me interesa · {idea.interest}
              </button>
              <div className="row" style={{ gap: '0.5rem' }}>
                <ShareButton path={`/ideas/${idea.id}`} title={idea.title} />
                {idea.isOwner && (
                  <Link to={`/projects/new?fromIdea=${idea.id}`} className="btn btn--primary btn--sm">
                    <Hammer size={15} /> Convertir en proyecto
                  </Link>
                )}
              </div>
            </footer>
          </>
        )}
      </article>

      {helpers.length > 0 && !editing && (
        <p className="helpers glass glass--tint-moss glass--quiet">
          <HandHeart size={18} />
          <span>
            {helpers.length === 1 ? '1 persona quiere' : `${helpers.length} personas quieren`} ayudar:{' '}
            {helpers.slice(0, 4).map((h, i) => (
              <span key={h.id}>
                {i > 0 && ', '}
                <Link to={`/people/${h.author.id}`}>{h.author.name}</Link>
              </span>
            ))}
          </span>
        </p>
      )}

      <section className="section" aria-labelledby="conversacion" style={{ marginTop: '2rem' }}>
        <h2 id="conversacion">Conversación</h2>

        <form className="glass glass--dense form-card" onSubmit={submitComment}>
          <div className="tabs" role="tablist" aria-label="Tipo de mensaje" style={{ justifySelf: 'start' }}>
            <button type="button" role="tab" className="tab" aria-selected={kind === 'Feedback'} onClick={() => setKind('Feedback')}>
              <MessageCircle size={14} style={{ verticalAlign: '-2px' }} /> Dar feedback
            </button>
            <button type="button" role="tab" className="tab" aria-selected={kind === 'Help'} onClick={() => setKind('Help')}>
              <HandHeart size={14} style={{ verticalAlign: '-2px' }} /> Quiero ayudar
            </button>
          </div>
          <label className="field">
            <span className="sr-only">Tu mensaje</span>
            <textarea
              className="textarea"
              style={{ minHeight: '6rem' }}
              required
              minLength={2}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={kind === 'Help' ? 'Cuéntale en qué puedes ayudar: tiempo, habilidades, experiencia…' : '¿Qué te parece? ¿Qué cambiarías o qué te preocupa?'}
            />
          </label>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn--primary" disabled={comment.isPending || !text.trim()}>
              <Send size={16} /> {kind === 'Help' ? 'Ofrecer ayuda' : 'Enviar feedback'}
            </button>
          </div>
        </form>

        {idea.comments.length === 0 ? (
          <p className="muted">Todavía nadie ha comentado. Puedes ser la primera persona.</p>
        ) : (
          <ul className="stack stack--sm">
            {idea.comments.map((c) => (
              <li key={c.id} className={`comment glass glass--quiet ${c.kind === 'Help' ? 'comment--help' : ''}`}>
                <header className="row row--between">
                  <Link to={`/people/${c.author.id}`} className="byline">
                    <Avatar name={c.author.name} src={c.author.avatarUrl} size={34} />
                    <span>
                      <strong>{c.author.name}</strong>
                      <small className="faint">{timeAgo(c.createdAt)}</small>
                    </span>
                  </Link>
                  <span className="row" style={{ gap: '0.4rem' }}>
                    <span className={`chip ${c.kind === 'Help' ? 'chip--open' : ''}`}>
                      {c.kind === 'Help' ? <HandHeart size={13} /> : <MessageCircle size={13} />} {COMMENT_KIND_LABEL[c.kind]}
                    </span>
                    {c.canDelete && (
                      <button type="button" className="icon-btn" aria-label="Borrar comentario" title="Borrar" onClick={() => window.confirm('¿Borrar este comentario?') && removeComment.mutate(c.id)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </span>
                </header>
                <p className="comment__body">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
