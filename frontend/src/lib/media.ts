import { API_URL } from './api'

/** Uploaded media is referenced as "/api/media/{id}"; make it absolute when the API lives elsewhere. */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('/') ? `${API_URL}${url}` : url
}

export type VideoSource =
  | { type: 'iframe'; src: string; label: string }
  | { type: 'file'; src: string }
  | { type: 'link'; src: string }

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^\d{6,12}$/

/**
 * Decides how a pasted video link can be shown. Only known embed hosts are put in an iframe,
 * so a pasted URL can never inject an arbitrary frame.
 */
export function parseVideo(raw: string): VideoSource | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    if (YOUTUBE_ID.test(id)) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}`, label: 'YouTube' }
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    const id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')
          ? parts[1]
          : null
    if (id && YOUTUBE_ID.test(id)) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}`, label: 'YouTube' }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).find((part) => VIMEO_ID.test(part))
    if (id) return { type: 'iframe', src: `https://player.vimeo.com/video/${id}`, label: 'Vimeo' }
  }
  if (/\.(mp4|webm|ogv)$/i.test(url.pathname)) return { type: 'file', src: url.toString() }
  return { type: 'link', src: url.toString() }
}

const MAX_SIDE = 1600
const SKIP_BELOW_BYTES = 450 * 1024

/**
 * Shrinks photos before upload so a phone picture doesn't blow the 4 MB limit (or the free-tier database).
 * GIFs are left alone to keep their animation.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
