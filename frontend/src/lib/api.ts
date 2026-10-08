/**
 * Thin fetch wrapper around the backend.
 * VITE_API_URL is empty in development (Vite proxies /api) and the Railway/Render URL in production.
 */
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

const TOKEN_KEY = 'crdev.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage can be unavailable in private windows; the session just won't persist */
  }
}

export const UNAUTHORIZED_EVENT = 'crdev:unauthorized'

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string[]>

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  email: 'Correo',
  password: 'Contraseña',
  title: 'Título',
  summary: 'Resumen',
  description: 'Detalles',
  body: 'Texto',
  headline: 'Titular',
  location: 'Ubicación',
  bio: 'Sobre ti',
  repoUrl: 'Enlace del repositorio',
  demoUrl: 'Enlace de la demo',
  githubUrl: 'GitHub',
  websiteUrl: 'Sitio web',
  linkedinUrl: 'LinkedIn',
  avatarUrl: 'Foto',
  message: 'Mensaje',
  media: 'Galería',
  roles: 'Puestos',
  skills: 'Habilidades',
  tags: 'Etiquetas',
  file: 'Archivo',
  workCompany: 'Empresa',
  workRole: 'Cargo',
  studyInstitution: 'Institución',
  studyProgram: 'Programa',
}

interface ProblemBody {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

function toApiError(status: number, body: ProblemBody | null): ApiError {
  if (body?.errors && Object.keys(body.errors).length > 0) {
    const lines = Object.entries(body.errors).map(
      ([field, messages]) => `${FIELD_LABELS[field] ?? field}: ${messages[0]}`,
    )
    return new ApiError(status, lines.join(' · '), body.errors)
  }
  const message =
    body?.detail ||
    body?.title ||
    (status === 429
      ? 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.'
      : status >= 500
        ? 'Algo falló de nuestro lado. Inténtalo de nuevo en un momento.'
        : 'No se pudo completar la acción.')
  return new ApiError(status, message)
}

async function request<T>(method: string, path: string, body?: unknown, form?: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      /* non-JSON error page from a proxy */
    }
  }

  if (!response.ok) {
    // A 401 on a call that carried a token means the session expired. Login failures also return 401
    // but carry no token, so they fall through to a normal error.
    if (response.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw toApiError(response.status, data as ProblemBody | null)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, undefined, form),
}

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
