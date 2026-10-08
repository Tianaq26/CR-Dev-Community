import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { useSkillCatalog } from '../hooks/queries'
import { cleanSkill, skillKey } from '../lib/skills'

interface Props {
  value: string[]
  onChange: (value: string[]) => void
  /** Pick exactly one (used for the skill a project role needs). */
  single?: boolean
  max?: number
  placeholder?: string
  label?: string
}

export function SkillPicker({ value, onChange, single = false, max = 20, placeholder = 'Escribe una habilidad y presiona Enter', label }: Props) {
  const [text, setText] = useState('')
  const id = useId()
  const { data: catalog } = useSkillCatalog()

  const selectedKeys = useMemo(() => new Set(value.map(skillKey)), [value])

  const groups = useMemo(() => {
    if (!catalog) return []
    const needle = skillKey(text)
    const all = [...catalog.groups, ...(catalog.community.length ? [{ name: 'De la comunidad', skills: catalog.community }] : [])]
    return all
      .map((g) => ({ ...g, skills: g.skills.filter((s) => !selectedKeys.has(skillKey(s)) && (!needle || skillKey(s).includes(needle))) }))
      .filter((g) => g.skills.length > 0)
  }, [catalog, text, selectedKeys])

  function add(raw: string) {
    const name = cleanSkill(raw)
    if (!name || name.length > 40) return
    if (single) {
      onChange([name])
    } else if (!selectedKeys.has(skillKey(name)) && value.length < max) {
      onChange([...value, name])
    }
    setText('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(text)
    } else if (e.key === 'Backspace' && text === '' && value.length > 0 && !single) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="skillpicker">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      {value.length > 0 && (
        <ul className="chips" aria-label="Seleccionadas">
          {value.map((skill) => (
            <li key={skill} className="chip chip--selected">
              {skill}
              <button type="button" className="chip__x" onClick={() => onChange(value.filter((s) => s !== skill))} aria-label={`Quitar ${skill}`}>
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="skillpicker__input">
        <input
          id={id}
          className="input"
          value={text}
          maxLength={40}
          placeholder={single && value.length > 0 ? 'Cambiar por otra…' : placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        <button type="button" className="btn btn--glass btn--sm" onClick={() => add(text)} disabled={!text.trim()}>
          <Plus size={15} /> Agregar
        </button>
      </div>
      {groups.length > 0 && (
        <div className="skillpicker__suggest" role="group" aria-label="Sugerencias">
          {groups.map((g) => (
            <div key={g.name} className="skillpicker__group">
              <span className="skillpicker__group-name">{g.name}</span>
              <div className="chips">
                {g.skills.map((s) => (
                  <button key={s} type="button" className="chip chip--button" onClick={() => add(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
