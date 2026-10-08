import { useMySkillKeys } from '../hooks/useMySkillKeys'
import { skillKey } from '../lib/skills'

interface Props {
  skills: string[]
  /** Highlight skills the viewer also has. */
  highlightMine?: boolean
  limit?: number
}

export function SkillChips({ skills, highlightMine = false, limit }: Props) {
  const mine = useMySkillKeys()
  const shown = limit ? skills.slice(0, limit) : skills
  const hidden = skills.length - shown.length
  if (skills.length === 0) return null
  return (
    <ul className="chips" aria-label="Habilidades">
      {shown.map((skill) => (
        <li key={skill} className={`chip ${highlightMine && mine.has(skillKey(skill)) ? 'chip--match' : ''}`}>
          {skill}
        </li>
      ))}
      {hidden > 0 && <li className="chip">+{hidden}</li>}
    </ul>
  )
}
