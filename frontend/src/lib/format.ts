import type { CommentKind, JoinRequestStatus, ProjectStatus, UserCard } from './types'

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'hace un momento'
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day')
  if (abs < 86400 * 365) return rtf.format(Math.round(seconds / (86400 * 30)), 'month')
  return dateFmt.format(new Date(iso))
}

export function fullDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  Planning: 'Planeando',
  Building: 'En desarrollo',
  Paused: 'En pausa',
  Launched: 'Lanzado',
}

export const REQUEST_STATUS_LABEL: Record<JoinRequestStatus, string> = {
  Pending: 'Pendiente',
  Accepted: 'Aceptada',
  Declined: 'No aceptada',
}

export const COMMENT_KIND_LABEL: Record<CommentKind, string> = {
  Feedback: 'Feedback',
  Help: 'Quiere ayudar',
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Stable pick from a small list, so the same title/name always gets the same colour. */
export function hashIndex(text: string, modulo: number): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h % modulo
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "Ingeniera en Libélula" / "Estudia Sonido en UNA" style lines for cards. */
export function workLine(work: UserCard['work']): string | null {
  if (!work) return null
  if (work.role && work.company) return `${work.role} en ${work.company}`
  return work.company ?? work.role
}

export function studyLine(study: UserCard['study']): string | null {
  if (!study) return null
  if (study.program && study.institution) return `${study.program} · ${study.institution}`
  return study.institution ?? study.program
}
