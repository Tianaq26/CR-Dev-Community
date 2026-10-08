import { useState, type CSSProperties } from 'react'
import { hashIndex, initials } from '../lib/format'
import { mediaUrl } from '../lib/media'

const PALETTE = ['#b05a31', '#8f6a45', '#7b8650', '#b9821f', '#8a5a44', '#6c7b6b', '#a4563f']

interface Props {
  name: string
  src?: string | null
  size?: number
}

export function Avatar({ name, src, size = 40 }: Props) {
  const [failed, setFailed] = useState(false)
  const url = mediaUrl(src)
  const style = { '--size': `${size}px` } as CSSProperties

  if (url && !failed) {
    return <img className="avatar" src={url} alt="" style={style} loading="lazy" onError={() => setFailed(true)} />
  }
  return (
    <span
      className="avatar avatar--initials"
      style={{ ...style, '--bg': PALETTE[hashIndex(name, PALETTE.length)] } as CSSProperties}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
