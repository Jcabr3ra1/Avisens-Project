import { useState } from 'react'
import type { ReactNode } from 'react'
import { IcChat, IcClose, IcUsers, IcSparkle, IcMic } from '@shared/ui/icons/icons'
import { panelIconBtn } from './shared'
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

const TabBtn = ({
  id,
  active,
  setTab,
  icon,
  children,
}: {
  id: Tab
  active: Tab
  setTab: (t: Tab) => void
  icon: ReactNode
  children: ReactNode
}) => {
  const on = active === id
  return (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1,
        border: 0,
        background: on ? 'var(--panel-3)' : 'transparent',
        color: on ? '#fff' : 'var(--panel-text-2)',
        fontSize: 12.5,
        fontWeight: 500,
        padding: '8px 10px',
        borderRadius: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxShadow: on ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

const ChatPanel = ({ open, onClose, onJump }: Props) => {
  const [tab, setTab] = useState<Tab>('equipo')

  return (
    <div className="chat-root">
      <div
        onClick={onClose}
        className="chat-backdrop"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      <aside
        className="chat-panel"
        style={{ transform: open ? 'translateX(0)' : 'translateX(110%)' }}
      >
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: '1px solid var(--panel-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.25) 0%, rgba(52, 211, 153, 0.05) 100%)',
                border: '1px solid rgba(52, 211, 153, 0.24)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--panel-accent)',
              }}>
                <IcChat size={16} />
              </div>
              <span style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: '#34d399',
                border: '2px solid var(--panel)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Comunicación</div>
              <div style={{ fontSize: 11, color: 'var(--panel-text-2)' }}>5 personas activas · 1 IA</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ ...panelIconBtn(), width: 32, height: 32 }}
            aria-label="Cerrar"
          >
            <IcClose size={14} />
          </button>
        </div>

        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 4 }}>
          <div style={{
            display: 'flex',
            gap: 2,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--panel-line)',
            padding: 3,
            borderRadius: 12,
            flex: 1,
          }}>
            <TabBtn id="equipo" active={tab} setTab={setTab} icon={<IcUsers size={13} />}>Equipo</TabBtn>
            <TabBtn id="ia"     active={tab} setTab={setTab} icon={<IcSparkle size={13} />}>IA</TabBtn>
            <TabBtn id="voz"    active={tab} setTab={setTab} icon={<IcMic size={13} />}>Voz</TabBtn>
          </div>
        </div>

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
