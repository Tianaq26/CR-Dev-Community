const FROM = 'áàäâãåéèëêíìïîóòöôõúùüûñç'
const TO = 'aaaaaaeeeeiiiiooooouuuunc'

/** Must stay in sync with SkillKey.Of on the server: matching compares these keys. */
export function skillKey(name: string): string {
  let out = ''
  let lastSpace = true
  for (const raw of name.trim().toLowerCase()) {
    const i = FROM.indexOf(raw)
    const ch = i >= 0 ? TO[i] : raw
    if (/\s/.test(ch)) {
      if (!lastSpace) out += ' '
      lastSpace = true
    } else {
      out += ch
      lastSpace = false
    }
  }
  return out.trimEnd()
}

export function cleanSkill(name: string): string {
  return name.split(/\s+/).filter(Boolean).join(' ')
}
