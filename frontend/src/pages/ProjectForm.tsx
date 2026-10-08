import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Film, Plus, Trash2, X } from 'lucide-react'
import { ImageUpload } from '../components/ImageUpload'
import { SkillPicker } from '../components/SkillPicker'
import { ErrorNote, Loading } from '../components/states'
import { useToast } from '../components/Toast'
import { useIdea, useProject } from '../hooks/queries'
import { api } from '../lib/api'
import { STATUS_LABEL } from '../lib/format'
import { mediaUrl, parseVideo } from '../lib/media'
import type { IdeaDetail, ProjectDetail, ProjectInput, ProjectStatus } from '../lib/types'

const EMPTY: ProjectInput = {
  title: '',
  summary: '',
  description: '',
  status: 'Planning',
  repoUrl: '',
  demoUrl: '',
  media: [],
  roles: [],
}

function fromDetail(p: ProjectDetail): ProjectInput {
  return {
    title: p.title,
    summary: p.summary,
    description: p.description,
    status: p.status,
    repoUrl: p.repoUrl ?? '',
    demoUrl: p.demoUrl ?? '',
    media: p.media.map((m) => ({ kind: m.kind, url: m.url })),
    roles: p.roles.map((r) => ({ id: r.id, title: r.title, skill: r.skill, description: r.description ?? '', isOpen: r.isOpen })),
  }
}

function fromIdeaInput(d: IdeaDetail): ProjectInput {
  return {
    ...EMPTY,
    title: d.title,
    summary: d.body.replace(/\s+/g, ' ').slice(0, 280),
    description: d.body,
    roles: d.tags.map((t) => ({ title: t, skill: t, description: '', isOpen: true })),
  }
}

/** Loads whatever the form starts from (an existing project, an idea, or nothing), then mounts the editor. */
export default function ProjectFormPage() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const fromIdeaId = search.get('fromIdea') ?? ''
  const editing = Boolean(id)

  const existing = useProject(id ?? '')
  const idea = useIdea(editing ? '' : fromIdeaId)

  if (editing) {
    if (existing.isError) return <div className="page page--narrow"><ErrorNote error={existing.error} /></div>
    if (!existing.data) return <Loading />
    if (!existing.data.isOwner) {
      return (
        <div className="page page--narrow">
          <ErrorNote error={new Error('Solo quien creó el proyecto puede editarlo.')} />
        </div>
      )
    }
    return <ProjectEditor key={existing.data.id} id={id} initial={fromDetail(existing.data)} fromIdea={false} />
  }

  if (fromIdeaId) {
    if (idea.isError) return <div className="page page--narrow"><ErrorNote error={idea.error} /></div>
    if (!idea.data) return <Loading />
    return <ProjectEditor key={idea.data.id} initial={fromIdeaInput(idea.data)} fromIdea />
  }

  return <ProjectEditor initial={EMPTY} fromIdea={false} />
}

function ProjectEditor({ id, initial, fromIdea }: { id?: string; initial: ProjectInput; fromIdea: boolean }) {
  const editing = Boolean(id)
  const [form, setForm] = useState<ProjectInput>(initial)
  const [videoUrl, setVideoUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const client = useQueryClient()
  const toast = useToast()

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        roles: form.roles.filter((r) => r.skill.trim()),
      }
      return editing
        ? api.put<ProjectDetail>(`/api/projects/${id}`, payload)
        : api.post<ProjectDetail>('/api/projects', payload)
    },
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ['projects'] })
      void client.invalidateQueries({ queryKey: ['project', saved.id] })
      toast.success(editing ? 'Cambios guardados.' : '¡Proyecto publicado!')
      navigate(`/projects/${saved.id}`, { replace: true })
    },
    onError: (e: Error) => {
      setError(e.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const images = form.media.filter((m) => m.kind === 'Image')
  const videos = form.media.filter((m) => m.kind === 'Video')

  function addVideo() {
    const url = videoUrl.trim()
    if (!url) return
    if (!parseVideo(url) || !/^https?:/i.test(url)) {
      toast.error('Pega un enlace completo que empiece con https://')
      return
    }
    set('media', [...form.media, { kind: 'Video', url }])
    setVideoUrl('')
  }

  function addImageUrl() {
    const url = imageUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      toast.error('El enlace de la imagen debe empezar con https://')
      return
    }
    set('media', [...form.media, { kind: 'Image', url }])
    setImageUrl('')
  }

  function updateRole(index: number, patch: Partial<ProjectInput['roles'][number]>) {
    set('roles', form.roles.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    save.mutate()
  }

  return (
    <div className="page page--narrow">
      <Link to={editing ? `/projects/${id}` : '/feed'} className="back">
        <ArrowLeft size={16} /> {editing ? 'Volver al proyecto' : 'Volver al tablero'}
      </Link>

      <header className="page-head">
        <p className="eyebrow">{editing ? 'Editar proyecto' : fromIdea ? 'De idea a proyecto' : 'Nuevo proyecto'}</p>
        <h1>{editing ? 'Ajusta los detalles' : 'Cuéntanos qué estás construyendo'}</h1>
        <hr className="rule" />
      </header>

      <form onSubmit={onSubmit} className="stack" style={{ gap: '1.5rem' }}>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <section className="glass glass--dense form-card">
          <h2>Lo básico</h2>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Nombre del proyecto</span>
              <input className="input" required minLength={3} maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Cuentos del Cafetal" />
            </label>
            <label className="field">
              <span className="field__label">Resumen en una frase</span>
              <textarea className="textarea" style={{ minHeight: '5rem' }} required minLength={10} maxLength={280} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Lo que verá la gente en las tarjetas del tablero." />
              <span className="field__hint">{form.summary.length}/280</span>
            </label>
            <label className="field">
              <span className="field__label">Etapa</span>
              <select className="select" value={form.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
                {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="glass glass--dense form-card">
          <h2>Cuéntalo con detalle</h2>
          <label className="field">
            <span className="field__label">Descripción</span>
            <textarea className="textarea" style={{ minHeight: '12rem' }} maxLength={8000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="De qué trata, qué problema resuelve, cómo van, qué falta. Puedes escribir varios párrafos." />
          </label>
        </section>

        <section className="glass glass--dense form-card">
          <h2>Imágenes y videos</h2>
          <p className="muted small">La primera imagen será la portada del proyecto. Las fotos se reducen automáticamente al subirlas.</p>

          {images.length > 0 && (
            <ul className="thumb-grid">
              {form.media.map((m, i) =>
                m.kind === 'Image' ? (
                  <li key={`${m.url}-${i}`} className="thumb">
                    <img src={mediaUrl(m.url)} alt="" />
                    {i === form.media.findIndex((x) => x.kind === 'Image') && <span className="thumb__cover">Portada</span>}
                    <button type="button" className="thumb__x" aria-label="Quitar imagen" onClick={() => set('media', form.media.filter((_, j) => j !== i))}>
                      <X size={14} />
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
          )}

          <div className="row">
            <ImageUpload multiple onUploaded={(url) => setForm((f) => ({ ...f, media: [...f.media, { kind: 'Image', url }] }))} />
            <span className="faint small">o pega un enlace:</span>
            <div className="row" style={{ flex: 1, minWidth: '14rem', flexWrap: 'nowrap' }}>
              <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/imagen.jpg" aria-label="Enlace de una imagen" />
              <button type="button" className="btn btn--glass btn--sm" onClick={addImageUrl} disabled={!imageUrl.trim()}>
                Agregar
              </button>
            </div>
          </div>

          <div className="divider" />

          {videos.length > 0 && (
            <ul className="stack stack--sm">
              {form.media.map((m, i) =>
                m.kind === 'Video' ? (
                  <li key={`${m.url}-${i}`} className="video-row">
                    <Film size={17} />
                    <span className="video-row__url">{m.url}</span>
                    <button type="button" className="icon-btn" aria-label="Quitar video" onClick={() => set('media', form.media.filter((_, j) => j !== i))}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
          )}
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideo())} placeholder="Enlace de un video de YouTube o Vimeo" aria-label="Enlace de un video" />
            <button type="button" className="btn btn--glass btn--sm" onClick={addVideo} disabled={!videoUrl.trim()}>
              <Film size={15} /> Agregar video
            </button>
          </div>
        </section>

        <section className="glass glass--dense form-card">
          <h2>¿A quién buscas?</h2>
          <p className="muted small">
            Cada puesto tiene una habilidad. Quien tenga esa habilidad en su perfil verá tu proyecto marcado como «Encaja contigo».
          </p>

          <ul className="stack">
            {form.roles.map((role, i) => (
              <li key={role.id ?? `new-${i}`} className="role-edit">
                <div className="form-grid">
                  <SkillPicker
                    single
                    label="Habilidad que necesitas"
                    value={role.skill ? [role.skill] : []}
                    onChange={(v) => updateRole(i, { skill: v[0] ?? '', title: !role.title || role.title === role.skill ? (v[0] ?? '') : role.title })}
                    placeholder="Ej. Músico, Frontend, Ilustración…"
                  />
                  <div className="form-grid form-grid--2">
                    <label className="field">
                      <span className="field__label">Nombre del puesto (opcional)</span>
                      <input className="input" maxLength={80} value={role.title} onChange={(e) => updateRole(i, { title: e.target.value })} placeholder="Ej. Músico para la banda sonora" />
                    </label>
                    <label className="field">
                      <span className="field__label">Qué necesitas de esta persona</span>
                      <input className="input" maxLength={400} value={role.description} onChange={(e) => updateRole(i, { description: e.target.value })} placeholder="Tiempo, estilo, experiencia…" />
                    </label>
                  </div>
                  <div className="row row--between">
                    <label className="toggle">
                      <input type="checkbox" checked={role.isOpen} onChange={(e) => updateRole(i, { isOpen: e.target.checked })} />
                      Puesto abierto
                    </label>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('roles', form.roles.filter((_, j) => j !== i))}>
                      <Trash2 size={15} /> Quitar puesto
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div>
            <button
              type="button"
              className="btn btn--glass"
              disabled={form.roles.length >= 10}
              onClick={() => set('roles', [...form.roles, { title: '', skill: '', description: '', isOpen: true }])}
            >
              <Plus size={16} /> Agregar un puesto
            </button>
          </div>
        </section>

        <section className="glass glass--dense form-card">
          <h2>Enlaces</h2>
          <div className="form-grid form-grid--2">
            <label className="field">
              <span className="field__label">Repositorio</span>
              <input className="input" type="url" maxLength={300} value={form.repoUrl} onChange={(e) => set('repoUrl', e.target.value)} placeholder="https://github.com/…" />
            </label>
            <label className="field">
              <span className="field__label">Demo o sitio</span>
              <input className="input" type="url" maxLength={300} value={form.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} placeholder="https://…" />
            </label>
          </div>
        </section>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Link to={editing ? `/projects/${id}` : '/feed'} className="btn btn--ghost">
            Cancelar
          </Link>
          <button className="btn btn--primary btn--lg" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar proyecto'}
          </button>
        </div>
      </form>
    </div>
  )
}
