import { describe, expect, it } from 'vitest'
import { parseVideo } from './media'

describe('parseVideo', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=10', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871'],
  ])('embeds %s', (input, src) => {
    expect(parseVideo(input)).toEqual(expect.objectContaining({ type: 'iframe', src }))
  })

  it('plays direct video files natively', () => {
    expect(parseVideo('https://example.com/clips/demo.mp4')).toEqual({
      type: 'file',
      src: 'https://example.com/clips/demo.mp4',
    })
  })

  it('never frames unknown hosts, only links to them', () => {
    expect(parseVideo('https://evil.example/embed/dQw4w9WgXcQ')).toEqual({
      type: 'link',
      src: 'https://evil.example/embed/dQw4w9WgXcQ',
    })
  })

  it('does not trust look-alike hosts or malformed ids', () => {
    expect(parseVideo('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')?.type).toBe('link')
    expect(parseVideo('https://www.youtube.com/watch?v="><script>')?.type).toBe('link')
  })

  it('rejects non-http schemes and garbage', () => {
    expect(parseVideo('javascript:alert(1)')).toBeNull()
    expect(parseVideo('data:text/html,hi')).toBeNull()
    expect(parseVideo('not a url')).toBeNull()
  })
})
