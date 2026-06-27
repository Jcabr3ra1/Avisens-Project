// DashboardPage.tsx — Página principal del panel de administración
// Orquesta todos los componentes del dashboard: topbar, galpones, métricas, chat y mascota AVIA.
// Es la primera pantalla que ve el administrador después de iniciar sesión.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IcClose } from '@shared/ui/icons/icons'
import ChatPanel from './components/chat/ChatPanel'          // Panel lateral de chat (Equipo, IA, Voz)
import MetricsHub from './components/MetricsHub/MetricsHub'  // Panel de métricas (temperatura, humedad, etc.)
import CoopPlaceholder from './components/CoopPlaceholder/CoopPlaceholder' // Galpón 3D isométrico
import GalponStrip from './components/GalponStrip/GalponStrip'  // Tira de cards de galpones
import AttentionBar from './components/AttentionBar/AttentionBar' // Barra de atención (alertas, tareas)
import ContextHeader from './components/ContextHeader/ContextHeader' // Encabezado del galpón seleccionado
import BottomRow from './components/BottomRow/BottomRow'     // Fila inferior (alertas, tareas, bienestar)
import Topbar from './components/Topbar/Topbar'              // Barra superior (granja, búsqueda, perfil)
import {
  GALPONES, GRANJAS, QUICK_ACTION_CATALOG,
  MAX_QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS,
} from './model'  // Datos mock y configuración
import type { MetricId } from './model'
import AviaMascot from './components/AviaMascot/AviaMascot'  // Mascota animada del campesino
import './DashboardPage.css'

function DashboardPage() {
  const navigate = useNavigate() // Para redirigir al login al cerrar sesión

  // ═══ Estado del dashboard ═══
  const [granjaId, setGranjaId] = useState(1)       // Qué granja está seleccionada
  const [galponId, setGalponId] = useState(1)       // Qué galpón está seleccionado
  const [granjaOpen, setGranjaOpen] = useState(false)   // Si el dropdown de granjas está abierto
  const [profileOpen, setProfileOpen] = useState(false) // Si el menú de perfil está abierto
  const [chatOpen, setChatOpen] = useState(false)    // Si el panel de chat está abierto
  const [unread, setUnread] = useState(3)            // Mensajes sin leer (badge rojo en AVIA)
  const [quickActions, setQuickActions] = useState<string[]>(DEFAULT_QUICK_ACTIONS) // Accesos rápidos del topbar
  const [adderOpen, setAdderOpen] = useState(false)  // Si el menú de agregar acceso rápido está abierto
  const [activeMetric, setActiveMetric] = useState<MetricId>('temp') // Métrica seleccionada en MetricsHub
  const [ventMode, setVentMode] = useState<'Auto' | 'Manual' | 'Apagado'>('Auto') // Modo de ventilación
  const [ventSpeed, setVentSpeed] = useState(60)     // Velocidad de ventilación (0-100%)

  // Acciones rápidas disponibles para agregar (las que no están ya seleccionadas)
  const availableToAdd = QUICK_ACTION_CATALOG.filter((a) => !quickActions.includes(a.id))
  const atLimit = quickActions.length >= MAX_QUICK_ACTIONS // Máximo 5 acciones rápidas

  // Agregar un acceso rápido al topbar
  const addQuickAction = (id: string) => {
    if (atLimit) return
    setQuickActions([...quickActions, id])
    if (availableToAdd.length <= 1) setAdderOpen(false) // Cerrar menú si no quedan más
  }

  // Quitar un acceso rápido del topbar
  const removeQuickAction = (id: string) => {
    setQuickActions(quickActions.filter((x) => x !== id))
  }

  // Scroll suave a una sección del dashboard (usado por AttentionBar)
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Datos de la granja y galpón seleccionados
  const granja = GRANJAS.find((g) => g.id === granjaId)!
  const galpon = GALPONES.find((g) => g.id === galponId)!

  // Total de alertas de todos los galpones (para el badge de AVIA)
  const totalAlertas = GALPONES.reduce((acc, g) => acc + g.alertas, 0)

  // Atajo de teclado: Ctrl+K o ⌘K abre/cierra el chat, Escape lo cierra
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setChatOpen((o) => !o)
      }
      if (e.key === 'Escape') setChatOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Cuando se abre el chat, marcar todos los mensajes como leídos
  useEffect(() => {
    if (chatOpen) setUnread(0)
  }, [chatOpen])

  return (
    <>
      {/* ═══ TOPBAR: granja activa, búsqueda, accesos rápidos, perfil ═══ */}
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
        onLogout={() => navigate('/login')} // Al cerrar sesión, ir al login
      />

      {/* ═══ CONTENIDO PRINCIPAL DEL DASHBOARD ═══ */}
      <section className="dash-content">
        {/* Barra de atención: alertas, tareas, mortalidad, bienestar */}
        <AttentionBar
          alertas={totalAlertas}
          tareasHoy={3}
          mortalidad="2.1%"
          mortalidadTrend="up"
          bienestar={80}
          onJump={scrollToSection}
        />

        {/* Tira de galpones: 4 cards clickables para seleccionar galpón */}
        <GalponStrip galpones={GALPONES} active={galponId} setActive={setGalponId} />

        {/* Encabezado del galpón seleccionado: nombre, aves, día, KPIs */}
        <ContextHeader galpon={galpon} />

        {/* Plano 3D isométrico del galpón con sensores clicables */}
        <div className="dash-grid">
          <div className="dash-col-center">
            <CoopPlaceholder galpon={galpon} />
          </div>
        </div>

        {/* Panel de métricas: Temperatura, Humedad, Ventilación, Alimento, Agua */}
        <MetricsHub
          active={activeMetric}
          setActive={setActiveMetric}
          ventSpeed={ventSpeed}
          setVentSpeed={setVentSpeed}
          ventMode={ventMode}
          setVentMode={setVentMode}
        />

        {/* Fila inferior: Alertas activas, Pendientes de hoy, ¿Cómo están las aves? */}
        <BottomRow />
      </section>

      {/* ═══ MASCOTA AVIA: avatar del campesino con mensajes de alerta ═══ */}
      <AviaController chatOpen={chatOpen} unread={unread} alertas={totalAlertas} onToggle={() => setChatOpen(o => !o)} />

      {/* ═══ PANEL DE CHAT: Equipo, IA (Lía), Voz ═══ */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}

// ═══ Mensajes rotativos que muestra AVIA ═══
// Cada 5 segundos cambia al siguiente mensaje con transición suave
const MSGS = [
  { text: 'Zona 2 tiene temperatura alta', type: 'warn' as const },    // Amarillo — alerta de temp
  { text: 'Humedad subiendo en el galpón', type: 'warn' as const },    // Amarillo — alerta de humedad
  { text: 'Las aves están comiendo bien', type: 'ok' as const },       // Verde — todo bien
  { text: 'Extractor 3 aumentó velocidad', type: 'info' as const },    // Azul — informativo
  { text: 'Mortalidad: 2.1% — vigilar', type: 'warn' as const },      // Amarillo — vigilar
]

// Controlador de la mascota AVIA — maneja la rotación de mensajes
const AviaController = ({ chatOpen, unread, alertas, onToggle }: {
  chatOpen: boolean; unread: number; alertas: number; onToggle: () => void
}) => {
  const [idx, setIdx] = useState(0)    // Índice del mensaje actual
  const [vis, setVis] = useState(true) // Si la burbuja es visible (para animación)

  // Timer que rota los mensajes cada 5 segundos
  // Se detiene cuando el chat está abierto
  useEffect(() => {
    if (chatOpen) return
    const iv = setInterval(() => {
      setVis(false) // Ocultar burbuja actual
      setTimeout(() => {
        setIdx(i => (i + 1) % MSGS.length) // Siguiente mensaje
        setVis(true) // Mostrar nueva burbuja
      }, 400) // 400ms de delay para la transición
    }, 5000) // Cambiar cada 5 segundos
    return () => clearInterval(iv)
  }, [chatOpen])

  // Renderizar la mascota con el mensaje actual
  return (
    <AviaMascot
      message={MSGS[idx].text}
      messageType={MSGS[idx].type}
      messageVisible={vis}
      chatOpen={chatOpen}
      unread={unread}
      hasAlerts={alertas > 0}
      onToggle={onToggle}
    />
  )
}

export default DashboardPage
