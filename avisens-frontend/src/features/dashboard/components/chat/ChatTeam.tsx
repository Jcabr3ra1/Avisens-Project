import { useEffect, useRef, useState } from 'react'
import { IcMic, IcChevronDown, IcPaperclip, IcSend } from '../icons/icons'
import { Avatar, Bubble, panelIconBtn, panelTextBtn } from './shared'
import type { Operator } from './shared'

const initialOperators: Operator[] = [
  { id: 1, name: 'Carlos Méndez',         role: 'Encargado Galpón 1', online: true,  color: '#10b981', initials: 'CM', unread: 2 },
  { id: 2, name: 'Andrea Pérez',          role: 'Veterinaria',         online: true,  color: '#34d399', initials: 'AP', unread: 0 },
  { id: 3, name: 'Luis Ortega',           role: 'Mantenimiento',       online: false, color: '#3b82f6', initials: 'LO', unread: 0 },
  { id: 4, name: 'María Salas',           role: 'Encargada Galpón 2',  online: true,  color: '#ef4444', initials: 'MS', unread: 1 },
  { id: 5, name: 'Equipo · Turno noche',  role: '4 miembros',          online: true,  color: '#7a8e84', initials: 'TN', unread: 0, group: true },
]

type Msg = { from: 'me' | 'them'; text: string; time: string }

const initialMsgs: Record<number, Msg[]> = {
  1: [
    { from: 'them', text: 'Buen día. La zona 2 sigue marcando temperatura alta, ya bajé la velocidad del extractor 3.', time: '08:42' },
    { from: 'them', text: 'Voy a chequear el sensor por si está sucio.', time: '08:43' },
    { from: 'me',   text: '¿Necesitas que abra ventilación por el lado este?', time: '08:45' },
    { from: 'them', text: 'Sí, déjala en manual al 70% un par de horas. Te aviso cuando estabilice.', time: '08:46' },
  ],
  2: [
    { from: 'them', text: 'Mortalidad sigue dentro del rango esperado. Mañana hago revisión visual del lote.', time: 'Ayer' },
  ],
  4: [
    { from: 'them', text: 'Galpón 2 al día. Mando reporte en la tarde.', time: '09:12' },
  ],
}

type Props = { onJump?: () => void }

const ChatTeam = ({ onJump }: Props) => {
  const [activeId, setActive] = useState(1)
  const [msgs, setMsgs] = useState<Record<number, Msg[]>>(initialMsgs)
  const [draft, setDraft] = useState('')
  const active = initialOperators.find((o) => o.id === activeId)!
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [activeId, msgs])

  const send = () => {
    if (!draft.trim()) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMsgs((m) => ({ ...m, [activeId]: [...(m[activeId] || []), { from: 'me', text: draft, time }] }))
    setDraft('')
    setTimeout(() => {
      setMsgs((m) => ({
        ...m,
        [activeId]: [...(m[activeId] || []), { from: 'them', text: 'Recibido, lo reviso ya.', time }],
      }))
    }, 1600)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontSize: 11, color: 'var(--panel-text-2)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
          Consulta en línea
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #112e23 0%, #194233 100%)',
          borderRadius: 14,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1px solid rgba(52, 211, 153, 0.18)',
        }}>
          <Avatar op={active} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: '#fff' }}>{active.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>{active.role}</div>
          </div>
          <button style={panelIconBtn(true)}><IcMic size={14} /></button>
          <button style={panelIconBtn(true)}><IcChevronDown size={14} /></button>
        </div>
      </div>

      <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--panel-text-2)' }}>Equipo</div>
        <button onClick={onJump} style={{ ...panelTextBtn, color: 'var(--panel-accent)' }}>+ Iniciar grupo</button>
      </div>
      <div className="panel-scroll" style={{ padding: '4px 20px 8px', display: 'flex', gap: 10, overflowX: 'auto' }}>
        {initialOperators.map((op) => (
          <button
            key={op.id}
            onClick={() => setActive(op.id)}
            style={{
              border: 0,
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              padding: 0,
              color: 'inherit',
              minWidth: 50,
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Avatar op={op} size={42} dim={activeId !== op.id} />
              {op.unread > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--panel)',
                }}>
                  {op.unread}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 10,
              color: activeId === op.id ? '#fff' : 'var(--panel-text-2)',
              maxWidth: 50,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {op.name.split(' ')[0]}
            </div>
          </button>
        ))}
      </div>

      <div ref={listRef} className="panel-scroll" style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--panel-text-2)', margin: '6px 0' }}>HOY · 8 DE MAYO</div>
        {(msgs[activeId] || []).map((m, i) => (
          <Bubble key={i} from={m.from} text={m.text} time={m.time} op={active} />
        ))}
      </div>

      <div style={{ padding: '10px 16px 18px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--panel-2)',
          border: '1px solid var(--panel-line)',
          borderRadius: 14,
          padding: 6,
        }}>
          <button style={panelIconBtn()}><IcPaperclip size={14} /></button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            placeholder={`Mensaje para ${active.name.split(' ')[0]}…`}
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              color: '#fff',
              fontSize: 13,
              padding: '4px 6px',
            }}
          />
          <button
            onClick={send}
            style={{
              background: draft.trim() ? 'var(--panel-accent)' : 'rgba(255, 255, 255, 0.08)',
              color: draft.trim() ? '#0a1612' : 'rgba(255, 255, 255, 0.4)',
              border: 0,
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              cursor: 'pointer',
            }}
          >
            <IcSend size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatTeam
