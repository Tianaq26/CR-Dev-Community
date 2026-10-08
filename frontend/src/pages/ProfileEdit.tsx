import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAuth, useMe } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { ImageUpload } from '../components/ImageUpload'
import { SkillPicker } from '../components/SkillPicker'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import type { ProfileInput, UserProfile } from '../lib/types'

function toInput(u: UserProfile): ProfileInput {
  return {
    name: u.name,
    headline: u.headline ?? '',
    location: u.location ?? '',
    bio: u.bio ?? '',
    avatarUrl: u.avatarUrl ?? '',
    workCompany: u.work?.company ?? '',
    workRole: u.work?.role ?? '',
    studyInstitution: u.study?.institution ?? '',
    studyProgram: u.study?.program ?? '',
    githubUrl: u.links.github ?? '',
    websiteUrl: u.links.website ?? '',
    linkedinUrl: u.links.linkedin ?? '',
    skills: u.skills,
  }
}

export default function ProfileEditPage() {
  const me = useMe()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const toast = useToast()
  const [search] = useSearchParams()
  const welcome = search.get('welcome') === '1'

  const [form, setForm] = useState<ProfileInput>(() => toInput(me))
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = useMutation({
    mutationFn: () => api.put<UserProfile>('/api/me', form),
    onSuccess: (updated) => {
      setUser(updated)
      void client.invalidateQueries()
      toast.success('Perfil guardado.')
      navigate(welcome ? '/feed' : `/people/${updated.id}`)
    },
    onError: (e: Error) => {
      setError(e.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    save.mutate()
  }

  return (
    <div className="page page--narrow">
      {!welcome && (
        <Link to={`/people/${me.id}`} className="back">
          <ArrowLeft size={16} /> Volver a mi perfil
        </Link>
      )}

      <header className="page-head">
        <p className="eyebrow">{welcome ? 'Último paso' : 'Mi perfil'}</p>
        <h1>{welcome ? `Bienvenida, ${me.name.split(' ')[0]}` : 'Edita tu perfil'}</h1>
        {welcome && (
          <p className="lede">
            Lo más importante son tus <strong>habilidades</strong>: con ellas te mostramos los proyectos que buscan justo lo
            que sabes hacer. Lo demás puedes completarlo cuando quieras.
          </p>
        )}
        <hr className="rule" />
      </header>

      <form onSubmit={onSubmit} className="stack" style={{ gap: '1.5rem' }}>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <section className="glass glass--dense form-card">
          <h2>Habilidades</h2>
          <SkillPicker value={form.skills} onChange={(skills) => set('skills', skills)} max={20} placeholder="Ej. Músico, Frontend, Ilustración…" />
        </section>

        <section className="glass glass--dense form-card">
          <h2>Sobre ti</h2>
          <div className="avatar-edit">
            <Avatar name={form.name || me.name} src={form.avatarUrl} size={84} />
            <div className="stack stack--sm">
              <div className="row">
                <ImageUpload onUploaded={(url) => set('avatarUrl', url)}>Cambiar foto</ImageUpload>
                {form.avatarUrl && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('avatarUrl', '')}>
                    <Trash2 size={15} /> Quitar
                  </button>
                )}
              </div>
              <span className="field__hint">JPG, PNG o WebP. Se ajusta automáticamente.</span>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-grid form-grid--2">
              <label className="field">
                <span className="field__label">Nombre</span>
                <input className="input" required minLength={2} maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Ubicación</span>
                <input className="input" maxLength={100} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Ciudad, país" />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Titular</span>
              <input className="input" maxLength={120} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Ej. Músico y productor, aprendiendo a programar" />
            </label>
            <label className="field">
              <span className="field__label">Cuéntanos de ti</span>
              <textarea className="textarea" maxLength={2000} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Qué haces, qué te mueve, qué tipo de proyectos buscas." />
            </label>
          </div>
        </section>

        <section className="glass glass--dense form-card">
          <h2>Trabajo y estudios</h2>
          <p className="muted small">Completa uno, los dos o ninguno: tú decides qué mostrar.</p>
          <div className="form-grid form-grid--2">
            <label className="field">
              <span className="field__label">Dónde trabajas</span>
              <input className="input" maxLength={100} value={form.workCompany} onChange={(e) => set('workCompany', e.target.value)} placeholder="Empresa u organización" />
            </label>
            <label className="field">
              <span className="field__label">Tu cargo</span>
              <input className="input" maxLength={100} value={form.workRole} onChange={(e) => set('workRole', e.target.value)} placeholder="Ej. Desarrolladora backend" />
            </label>
            <label className="field">
              <span className="field__label">Dónde estudias</span>
              <input className="input" maxLength={100} value={form.studyInstitution} onChange={(e) => set('studyInstitution', e.target.value)} placeholder="Universidad, colegio, escuela…" />
            </label>
            <label className="field">
              <span className="field__label">Qué estudias</span>
              <input className="input" maxLength={100} value={form.studyProgram} onChange={(e) => set('studyProgram', e.target.value)} placeholder="Carrera o curso" />
            </label>
          </div>
        </section>

        <section className="glass glass--dense form-card">
          <h2>Enlaces</h2>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Sitio o portafolio</span>
              <input className="input" type="url" maxLength={300} value={form.websiteUrl} onChange={(e) => set('websiteUrl', e.target.value)} placeholder="https://…" />
            </label>
            <div className="form-grid form-grid--2">
              <label className="field">
                <span className="field__label">GitHub</span>
                <input className="input" type="url" maxLength={300} value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} placeholder="https://github.com/…" />
              </label>
              <label className="field">
                <span className="field__label">LinkedIn</span>
                <input className="input" type="url" maxLength={300} value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
              </label>
            </div>
          </div>
        </section>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {welcome && (
            <Link to="/feed" className="btn btn--ghost">
              Lo haré después
            </Link>
          )}
          <button className="btn btn--primary btn--lg" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : welcome ? 'Guardar y entrar' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
