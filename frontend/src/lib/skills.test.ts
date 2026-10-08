import { describe, expect, it } from 'vitest'
import { skillKey } from './skills'

// These cases mirror UnitTests.SkillKey_ignores_case_accents_and_extra_spaces on the backend.
describe('skillKey', () => {
  it.each([
    ['Músico', 'musico'],
    ['  DISEÑO   de   sonido ', 'diseno de sonido'],
    ['Ilustración', 'ilustracion'],
    ['QA / Pruebas', 'qa / pruebas'],
    ['C#', 'c#'],
  ])('%s -> %s', (input, expected) => {
    expect(skillKey(input)).toBe(expected)
  })
})
