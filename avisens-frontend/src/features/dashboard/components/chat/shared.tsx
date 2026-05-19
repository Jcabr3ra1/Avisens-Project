import type { CSSProperties, ReactNode } from 'react'

export type Operator = {
  id: number
  name: string
  role: string
  online: boolean
  color: string
  initials: string
  unread: number
  group?: boolean
}

export const panelIconBtn = (accent = false): CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: 9,
  background: accent ? 'rgba(52, 211, 153, 0.14)' : 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--panel-line)',
  color: accent ? 'var(--panel-accent)' : 'var(--panel-text-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
})

export const panelTextBtn: CSSProperties = {
  background: 'transparent',
  border: 0,
  color: 'var(--panel-text-2)',
  fontSize: 11.5,
  fontWeight: 500,
  cursor: 'pointer',
}

type AvatarProps = {
  op: Operator
  size?: number
  dim?: boolean
}

export const Avatar = ({ op, size = 36, dim = false }: AvatarProps) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: op.color,
      color: '#fff',
      fontSize: size * 0.34,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: dim ? 0.55 : 1,
      border: '2px solid var(--panel)',
      position: 'relative',
    }}
  >
    {op.initials}
    {op.online && (
      <span
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: '50%',
          background: '#34d399',
          border: '2px solid var(--panel)',
        }}
      />
    )}
  </div>
)

type BubbleProps = {
  from: 'me' | 'them'
  text: string
  time: string
  op?: Operator
  extra?: ReactNode
}

export const Bubble = ({ from, text, time, op, extra }: BubbleProps) => {
  const isMe = from === 'me'
  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
      {!isMe && op && <Avatar op={op} size={26} />}
      <div style={{ maxWidth: '78%' }}>
        <div
          style={{
            background: isMe ? 'var(--panel-accent)' : 'var(--panel-2)',
            color: isMe ? '#0a1612' : 'var(--panel-text)',
            padding: '9px 13px',
            borderRadius: 14,
            borderBottomRightRadius: isMe ? 4 : 14,
            borderBottomLeftRadius: !isMe ? 4 : 14,
            fontSize: 13,
            lineHeight: 1.45,
            border: !isMe ? '1px solid var(--panel-line)' : 'none',
          }}
        >
          {text}
        </div>
        {extra}
        <div
          className="mono"
          style={{
            fontSize: 9.5,
            color: 'var(--panel-text-2)',
            marginTop: 3,
            textAlign: isMe ? 'right' : 'left',
            fontFamily: 'DM Mono, monospace',
          }}
        >
          {time}
        </div>
      </div>
    </div>
  )
}
