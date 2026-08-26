import type { CSSProperties } from 'react'

// Separado de shared.tsx a proposito: react-refresh pide que un archivo de
// componentes no exporte tambien constantes, porque rompe el hot reload.

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
