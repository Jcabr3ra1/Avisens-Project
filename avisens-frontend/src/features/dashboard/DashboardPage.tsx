import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IcChat, IcClose } from './components/icons/icons'
import ChatPanel from './components/chat/ChatPanel'
import MetricsHub from './components/MetricsHub/MetricsHub'
import CoopPlaceholder from './components/CoopPlaceholder/CoopPlaceholder'
import GalponStrip from './components/GalponStrip/GalponStrip'
import AttentionBar from './components/AttentionBar/AttentionBar'
import ContextHeader from './components/ContextHeader/ContextHeader'
import BottomRow from './components/BottomRow/BottomRow'
import Sidebar from './components/Sidebar/Sidebar'
import Topbar from './components/Topbar/Topbar'
import {
  GALPONES, GRANJAS, QUICK_ACTION_CATALOG,
  MAX_QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS,
} from './model'
import type { MetricId } from './model'
import { usePauseOnHidden } from '@shared/hooks/usePauseOnHidden'
import './DashboardPage.css'

function DashboardPage() {
  const navigate = useNavigate()
  const [granjaId, setGranjaId] = useState(1)
  const [galponId, setGalponId] = useState(1)
  const [granjaOpen, setGranjaOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(3)
  const [quickActions, setQuickActions] = useState<string[]>(DEFAULT_QUICK_ACTIONS)
  const [adderOpen, setAdderOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('avisens.sidebarCollapsed') === '1'
  })
  const [activeMetric, setActiveMetric] = useState<MetricId>('temp')
  const [ventMode, setVentMode] = useState<'Auto' | 'Manual' | 'Apagado'>('Auto')
  const [ventSpeed, setVentSpeed] = useState(60)

  usePauseOnHidden()

  useEffect(() => {
    window.localStorage.setItem('avisens.sidebarCollapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const availableToAdd = QUICK_ACTION_CATALOG.filter((a) => !quickActions.includes(a.id))
  const atLimit = quickActions.length >= MAX_QUICK_ACTIONS

  const addQuickAction = (id: string) => {
    if (atLimit) return
    setQuickActions([...quickActions, id])
    if (availableToAdd.length <= 1) setAdderOpen(false)
  }
  const removeQuickAction = (id: string) => {
    setQuickActions(quickActions.filter((x) => x !== id))
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const granja = GRANJAS.find((g) => g.id === granjaId)!
  const galpon = GALPONES.find((g) => g.id === galponId)!

  const totalAves = GALPONES.reduce((acc, g) => acc + g.aves, 0)
  const totalAlertas = GALPONES.reduce((acc, g) => acc + g.alertas, 0)
  const galponesActivos = GALPONES.filter((g) => g.status !== 'empty').length

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setChatOpen((o) => !o)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarCollapsed((v) => !v)
      }
      if (e.key === 'Escape') setChatOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (chatOpen) setUnread(0)
  }, [chatOpen])

  return (
    <div className={`dash-page${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        galponesActivos={galponesActivos}
        totalAves={totalAves}
        totalAlertas={totalAlertas}
      />

      <main className="dash-main">
        <Topbar
          granja={granja}
          granjaId={granjaId}
          setGranjaId={setGranjaId}
          granjaOpen={granjaOpen}
          setGranjaOpen={setGranjaOpen}
          quickActions={quickActions}
          addQuickAction={addQuickAction}
          removeQuickAction={removeQuickAction}
          atLimit={atLimit}
          adderOpen={adderOpen}
          setAdderOpen={setAdderOpen}
          availableToAdd={availableToAdd}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          onLogout={() => navigate('/login')}
        />

        <section className="dash-content">
          <AttentionBar
            alertas={totalAlertas}
            tareasHoy={3}
            mortalidad="2.1%"
            mortalidadTrend="up"
            bienestar={80}
            onJump={scrollToSection}
          />

          <GalponStrip galpones={GALPONES} active={galponId} setActive={setGalponId} />

          <ContextHeader galpon={galpon} />

          <div className="dash-grid">
            <div className="dash-col-center">
              <CoopPlaceholder galpon={galpon} />
            </div>
          </div>

          <MetricsHub
            active={activeMetric}
            setActive={setActiveMetric}
            ventSpeed={ventSpeed}
            setVentSpeed={setVentSpeed}
            ventMode={ventMode}
            setVentMode={setVentMode}
          />

          <BottomRow />
        </section>
      </main>

      <button
        onClick={() => setChatOpen((o) => !o)}
        className={`dash-chat-fab${chatOpen ? ' active' : ''}${unread > 0 ? ' has-unread' : ''}`}
        aria-label={chatOpen ? 'Cerrar chat' : 'Abrir chat'}
        title={chatOpen ? 'Cerrar chat (⌘K)' : 'Abrir chat (⌘K)'}
      >
        {chatOpen ? <IcClose size={22} /> : <IcChat size={22} />}
        {!chatOpen && unread > 0 && <span className="dash-chat-fab-badge">{unread}</span>}
        {!chatOpen && unread > 0 && <span className="dash-chat-fab-pulse" />}
      </button>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

export default DashboardPage
