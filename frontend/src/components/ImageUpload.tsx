import { useRef, useState, type ReactNode } from 'react'
import { ImagePlus } from 'lucide-react'
import { api } from '../lib/api'
import { prepareImage } from '../lib/media'
import { useToast } from './Toast'

interface Props {
  onUploaded: (url: string) => void
  children?: ReactNode
  className?: string
  multiple?: boolean
}

/** A button that opens the file picker, shrinks the photo, uploads it, and hands back its URL. */
export function ImageUpload({ onUploaded, children, className = 'btn btn--glass btn--sm', multiple = false }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const prepared = await prepareImage(file)
        const form = new FormData()
        form.append('file', prepared)
        const result = await api.upload<{ url: string }>('/api/media', form)
        onUploaded(result.url)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        hidden
        onChange={(e) => void handle(e.target.files)}
      />
      <button type="button" className={className} disabled={busy} onClick={() => input.current?.click()}>
        {children ?? (
          <>
            <ImagePlus size={16} /> {busy ? 'Subiendo…' : 'Subir imagen'}
          </>
        )}
      </button>
    </>
  )
}
