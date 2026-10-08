import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { skillKey } from '../lib/skills'

/** Keys of the signed-in user's skills, used to highlight where somebody else overlaps with them. */
export function useMySkillKeys(): Set<string> {
  const { user } = useAuth()
  return useMemo(() => new Set((user?.skills ?? []).map(skillKey)), [user])
}
