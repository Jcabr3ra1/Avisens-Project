import { useState } from 'react'
import type { ReactNode } from 'react'
import { IcChat, IcClose, IcUsers, IcSparkle, IcMic } from '@shared/ui/icons/icons'
import ChatTeam from './ChatTeam'
import ChatAi from './ChatAi'
import ChatVoice from './ChatVoice'
import './chat.css'

type Tab = 'equipo' | 'ia' | 'voz'

type Props = {
  open: boolean
  onClose: () => void
  onJump?: () => void
}

const TabBtn = ({ id, active, setTab, icon, children }: {
  id: Tab; active: Tab; setTab: (t: Tab) => void; icon: ReactNode; children: ReactNode
}) => {
  const on = active === id
  return (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1, border: 0,
        background: on ? 'var(--green-d)' : 'transparent',
        color: on ? '#ffffff' : 'var(--text3)',
        fontSize: 12.5, fontWeight: 600,
        padding: '8px 10px', borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: on ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
        transition: 'all 0.15s', cursor: 'pointer',
      }}
    >
      {icon}<span>{children}</span>
    </button>
  )
}

const ChatPanel = ({ open, onClose, onJump }: Props) => {
  const [tab, setTab] = useState<Tab>('equipo')

  return (
    <div className="chat-root">
      <div onClick={onClose} className="chat-backdrop" style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
      <aside className="chat-panel" style={{ transform: open ? 'translateX(0)' : 'translateX(110%)' }}>

        {/* Header */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #f0f7f3, #ffffff)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}>
                <IcChat size={17} />
              </div>
              <span style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 12, height: 12, borderRadius: '50%',
                background: '#10b981', border: '2.5px solid #ffffff',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Comunicación</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>5 personas activas · 1 IA</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'var(--bg-tint)', border: '1px solid var(--border)',
              color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Cerrar"
          >
            <IcClose size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 4 }}>
          <div style={{
            display: 'flex', gap: 3,
            background: 'var(--bg-tint)', border: '1px solid var(--border)',
            padding: 3, borderRadius: 12, flex: 1,
          }}>
            <TabBtn id="equipo" active={tab} setTab={setTab} icon={<IcUsers size={13} />}>Equipo</TabBtn>
            <TabBtn id="ia" active={tab} setTab={setTab} icon={<IcSparkle size={13} />}>IA</TabBtn>
            <TabBtn id="voz" active={tab} setTab={setTab} icon={<IcMic size={13} />}>Voz</TabBtn>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {tab === 'equipo' && <ChatTeam onJump={onJump} />}
          {tab === 'ia' && <ChatAi />}
          {tab === 'voz' && <ChatVoice />}
        </div>
      </aside>
    </div>
  )
}

export default ChatPanel
