import { Share2 } from 'lucide-react'
import { useToast } from './Toast'

interface Props {
  /** Path inside the site, e.g. /projects/123 */
  path: string
  title: string
  text?: string
}

/**
 * Phones get the system share sheet (WhatsApp, etc.). On a computer, where that sheet is awkward,
 * the link is simply copied.
 */
export function ShareButton({ path, title, text }: Props) {
  const toast = useToast()

  async function share() {
    const url = `${window.location.origin}${path}`
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches
    if (isTouch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return // closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado. Ya puedes pegarlo donde quieras.')
    } catch {
      toast.error(`No pudimos copiarlo solo. Copia este enlace: ${url}`)
    }
  }

  return (
    <button type="button" className="btn btn--glass btn--sm" onClick={() => void share()}>
      <Share2 size={15} /> Compartir
    </button>
  )
}
