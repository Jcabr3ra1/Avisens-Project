import { useEffect, useRef } from 'react'
import type { StoryMediaSource } from '../../model/landingContent'

type Props = {
  media: StoryMediaSource
  priority?: boolean
  className?: string
}

export default function StoryMedia({ media, priority = false, className = '' }: Props) {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = video.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) element.pause()
    }, { threshold: 0.05 })
    const pauseWhenHidden = () => {
      if (document.hidden) element.pause()
    }
    observer.observe(element)
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [media])

  return media.kind === 'video' ? (
    <video
      ref={video}
      className={`av-story-media av-story-media--video ${className}`}
      src={media.src}
      poster={media.poster}
      aria-label={media.description}
      style={{ objectPosition: media.position }}
      controls
      playsInline
      preload="none"
    >
      {media.captions && (
        <track kind="captions" src={media.captions.src} srcLang={media.captions.language} label={media.captions.label} default />
      )}
      Tu navegador no permite reproducir este video.
    </video>
  ) : (
    <img
      className={`av-story-media ${className}`}
      src={media.src}
      alt={media.description}
      style={{ objectPosition: media.position }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      width={1536}
      height={1024}
    />
  )
}
