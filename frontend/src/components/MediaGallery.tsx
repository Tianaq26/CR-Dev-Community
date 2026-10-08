import { useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { mediaUrl, parseVideo } from '../lib/media'
import type { MediaView } from '../lib/types'

function Stage({ item, title }: { item: MediaView; title: string }) {
  if (item.kind === 'Image') {
    return <img className="gallery__img" src={mediaUrl(item.url)} alt={`Imagen de ${title}`} />
  }
  const video = parseVideo(item.url)
  if (video?.type === 'iframe') {
    return (
      <iframe
        className="gallery__frame"
        src={video.src}
        title={`Video de ${title} (${video.label})`}
        loading="lazy"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      />
    )
  }
  if (video?.type === 'file') {
    return <video className="gallery__img" src={video.src} controls preload="metadata" />
  }
  return (
    <a className="gallery__link" href={item.url} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={26} />
      <span>Ver el video en una pestaña nueva</span>
      <small>{(() => { try { return new URL(item.url).hostname } catch { return '' } })()}</small>
    </a>
  )
}

export function MediaGallery({ media, title }: { media: MediaView[]; title: string }) {
  const [index, setIndex] = useState(0)
  if (media.length === 0) return null
  const current = media[Math.min(index, media.length - 1)]

  return (
    <section className="gallery" aria-label="Galería del proyecto">
      <div className="gallery__stage glass glass--quiet">
        <Stage key={current.id} item={current} title={title} />
      </div>
      {media.length > 1 && (
        <ul className="gallery__thumbs">
          {media.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={`gallery__thumb ${i === index ? 'is-active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Ver ${item.kind === 'Image' ? 'imagen' : 'video'} ${i + 1} de ${media.length}`}
                aria-current={i === index}
              >
                {item.kind === 'Image' ? (
                  <img src={mediaUrl(item.url)} alt="" loading="lazy" />
                ) : (
                  <span className="gallery__thumb-video">
                    <Play size={20} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
