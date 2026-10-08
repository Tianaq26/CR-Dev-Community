import { useState, type FormEvent } from 'react'
import { SkillPicker } from './SkillPicker'

export interface IdeaFormValue {
  title: string
  body: string
  tags: string[]
}

interface Props {
  initial?: IdeaFormValue
  submitLabel: string
  busy: boolean
  error?: string | null
  onSubmit: (value: IdeaFormValue) => void
  onCancel?: () => void
}

export function IdeaForm({ initial, submitLabel, busy, error, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState<IdeaFormValue>(initial ?? { title: '', body: '', tags: [] })

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit(value)
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span className="field__label">Tu idea en pocas palabras</span>
        <input className="input" required minLength={3} maxLength={140} value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} placeholder="Ej. Un archivo sonoro de oficios que se pierden" />
      </label>
      <label className="field">
        <span className="field__label">Cuéntala</span>
        <textarea className="textarea" required minLength={10} maxLength={5000} value={value.body} onChange={(e) => setValue({ ...value, body: e.target.value })} placeholder="Qué imaginas, a quién le serviría, qué dudas tienes…" />
      </label>
      <div className="field">
        <SkillPicker
          label="¿Qué habilidades te harían falta? (opcional)"
          value={value.tags}
          max={8}
          onChange={(tags) => setValue({ ...value, tags })}
          placeholder="Ej. Ilustración, Backend…"
        />
        <span className="field__hint">Así la idea le aparece a quienes tienen esas habilidades.</span>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="btn btn--primary" disabled={busy}>
          {busy ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
