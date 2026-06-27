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
  width: 32, height: 32, borderRadius: 9,
  background: accent ? '#ecfdf5' : 'var(--bg-tint)',
  border: '1px solid var(--border)',
  color: accent ? 'var(--green-d)' : 'var(--text3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
})

export const panelTextBtn: CSSProperties = {
  background: 'transparent', border: 0,
  color: 'var(--green-d)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
}

type AvatarProps = { op: Operator; size?: number; dim?: boolean }

export const Avatar = ({ op, size = 36, dim = false }: AvatarProps) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: op.color, color: '#fff',
    fontSize: size * 0.34, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: dim ? 0.55 : 1,
    border: '2.5px solid #ffffff',
    position: 'relative',
    boxShadow: '0 2px 6px rgba(10, 40, 28, 0.1)',
  }}>
    {op.initials}
    {op.online && (
      <span style={{
        position: 'absolute', bottom: -1, right: -1,
        width: size * 0.28, height: size * 0.28, borderRadius: '50%',
        background: '#10b981', border: '2px solid #ffffff',
      }} />
    )}
  </div>
)

type BubbleProps = { from: 'me' | 'them'; text: string; time: string; op?: Operator; extra?: ReactNode }

export const Bubble = ({ from, text, time, op, extra }: BubbleProps) => {
  const isMe = from === 'me'
  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
      {!isMe && op && <Avatar op={op} size={26} />}
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          background: isMe ? 'var(--green-d)' : '#ffffff',
          color: isMe ? '#ffffff' : 'var(--text)',
          padding: '10px 14px', borderRadius: 16,
          borderBottomRightRadius: isMe ? 4 : 16,
          borderBottomLeftRadius: !isMe ? 4 : 16,
          fontSize: 13, lineHeight: 1.5,
          border: !isMe ? '1px solid var(--border)' : 'none',
          boxShadow: isMe ? '0 2px 8px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(10, 40, 28, 0.04)',
        }}>
          {text}
        </div>
        {extra}
        <div className="mono" style={{
          fontSize: 9.5, color: 'var(--text4)',
          marginTop: 3, textAlign: isMe ? 'right' : 'left',
        }}>
          {time}
        </div>
      </div>
    </div>
  )
}
