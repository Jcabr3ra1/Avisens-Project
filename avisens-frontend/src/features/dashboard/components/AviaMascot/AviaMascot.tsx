// AviaMascot.tsx — Avatar animado del campesino con sombrero vueltiao
// Es la mascota de AVISENS que aparece en la esquina inferior derecha del dashboard.
// Muestra mensajes de alerta rotativos y al tocarla abre el panel de chat.
import './AviaMascot.css'

// Componente SVG del avatar del campesino colombiano
// Dibujado a mano con formas SVG: cara, sombrero vueltiao, camisa verde AVISENS
const AviaAvatar = () => (
  <svg className="avia-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cuello y camisa verde (color institucional de AVISENS) */}
    <path d="M38 88 L60 95 L82 88 L85 120 L35 120 Z" fill="#2d8659" />
    <path d="M45 90 L60 96 L75 90 L73 100 L47 100 Z" fill="#247a4e" />
    {/* Cuello de la camisa con detalle */}
    <path d="M48 88 L55 92 L60 89 L65 92 L72 88 L70 93 L60 97 L50 93 Z" fill="#34a065" />

    {/* Cabeza — elipse color piel morena colombiana */}
    <ellipse cx="60" cy="68" rx="22" ry="24" fill="#c68642" />
    {/* Sombra que proyecta el ala del sombrero sobre la frente */}
    <ellipse cx="60" cy="58" rx="20" ry="4" fill="rgba(0,0,0,0.08)" />

    {/* Orejas a los lados de la cabeza */}
    <ellipse cx="38" cy="67" rx="4" ry="6" fill="#b5753a" />
    <ellipse cx="82" cy="67" rx="4" ry="6" fill="#b5753a" />

    {/* Ojos — fondo blanco + iris oscuro con clase avia-eye para animación de parpadeo */}
    <ellipse cx="50" cy="66" rx="3" ry="3.5" fill="#ffffff" />
    <ellipse cx="70" cy="66" rx="3" ry="3.5" fill="#ffffff" />
    <ellipse cx="50.5" cy="66.5" rx="2" ry="2.2" fill="#2c1810" className="avia-eye" />
    <ellipse cx="70.5" cy="66.5" rx="2" ry="2.2" fill="#2c1810" className="avia-eye" />
    {/* Puntos de brillo en los ojos para dar vida */}
    <circle cx="51.5" cy="65.5" r="0.8" fill="#ffffff" />
    <circle cx="71.5" cy="65.5" r="0.8" fill="#ffffff" />

    {/* Cejas arqueadas */}
    <path d="M45 61 Q50 59 55 61" stroke="#5c3a1e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M65 61 Q70 59 75 61" stroke="#5c3a1e" strokeWidth="1.5" fill="none" strokeLinecap="round" />

    {/* Nariz pequeña con curva */}
    <path d="M58 70 Q60 73 62 70" stroke="#a06030" strokeWidth="1.2" fill="none" strokeLinecap="round" />

    {/* Sonrisa amplia — tiene clase avia-smile para agrandar en hover */}
    <path d="M48 76 Q54 83 60 82 Q66 83 72 76" stroke="#8b4520" strokeWidth="1.8" fill="none" strokeLinecap="round" className="avia-smile" />
    {/* Dientes blancos visibles en la sonrisa */}
    <path d="M52 78 Q56 82 60 81 Q64 82 68 78" fill="#ffffff" opacity="0.9" />

    {/* ═══ SOMBRERO VUELTIAO ═══ */}
    {/* Patrimonio cultural colombiano — sombrero típico del Caribe/interior */}

    {/* Ala del sombrero (elipse ancha) con patrón decorativo */}
    <ellipse cx="60" cy="52" rx="34" ry="10" fill="#d4a24e" />
    <ellipse cx="60" cy="52" rx="34" ry="10" fill="url(#hatPattern)" />
    <ellipse cx="60" cy="51" rx="33" ry="9" fill="none" stroke="#8b6914" strokeWidth="0.8" />

    {/* Copa del sombrero (parte superior curva) */}
    <path d="M40 52 Q40 32 60 30 Q80 32 80 52" fill="#c4922e" />
    <path d="M40 52 Q40 32 60 30 Q80 32 80 52" fill="url(#hatPattern2)" />
    {/* Banda negra horizontal del sombrero */}
    <path d="M40 48 Q50 46 60 46 Q70 46 80 48" stroke="#1a1a1a" strokeWidth="2.5" fill="none" />
    {/* Detalle punteado en la banda */}
    <path d="M42 48 Q50 46.5 60 46.5 Q70 46.5 78 48" stroke="#333" strokeWidth="1" fill="none" strokeDasharray="2 2" />

    {/* Patrones zigzag del vueltiao (2 filas de triángulos negros) */}
    <path d="M44 42 L47 38 L50 42 L53 38 L56 42 L59 38 L62 42 L65 38 L68 42 L71 38 L74 42" stroke="#1a1a1a" strokeWidth="1" fill="none" />
    <path d="M46 36 L49 33 L52 36 L55 33 L58 36 L61 33 L64 36 L67 33 L70 36 L73 33" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />

    {/* Patrones SVG reutilizables para la textura del sombrero */}
    <defs>
      <pattern id="hatPattern" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0 4 L4 0 L8 4" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" fill="none" />
      </pattern>
      <pattern id="hatPattern2" patternUnits="userSpaceOnUse" width="6" height="6">
        <path d="M0 3 L3 0 L6 3" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" fill="none" />
      </pattern>
    </defs>
  </svg>
)

// Props que recibe la mascota desde el DashboardPage
type Props = {
  message: string          // Texto del mensaje de alerta actual
  messageType: 'warn' | 'ok' | 'info'  // Tipo de mensaje (cambia el color del borde)
  messageVisible: boolean  // Si la burbuja está visible (para animación de entrada/salida)
  chatOpen: boolean        // Si el panel de chat está abierto
  unread: number           // Cantidad de mensajes sin leer (se muestra en badge rojo)
  hasAlerts: boolean       // Si hay alertas activas (muestra anillo pulsante)
  onToggle: () => void     // Función para abrir/cerrar el chat
}

// Componente principal de la mascota AVIA
function AviaMascot({ message, messageType, messageVisible, chatOpen, unread, hasAlerts, onToggle }: Props) {
  return (
    // Contenedor fijo en la esquina inferior derecha
    <div className={`avia${chatOpen ? ' avia--open' : ''}`}>
      {/* Burbuja de mensaje — solo visible cuando el chat está cerrado */}
      {/* Cambia entre mensajes cada 5 segundos con transición suave */}
      {!chatOpen && (
        <div className={`avia-bubble avia-bubble--${messageType}${messageVisible ? ' visible' : ''}`}>
          <span>{message}</span>
          <div className="avia-bubble-arrow" />
        </div>
      )}

      {/* Botón circular de la mascota */}
      <button onClick={onToggle} className="avia-btn" aria-label={chatOpen ? 'Cerrar chat' : 'Hablar con AVIA'}>
        {chatOpen ? (
          // Cuando el chat está abierto, muestra ícono X para cerrar
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          // Cuando está cerrado, muestra el avatar del campesino
          <>
            <div className="avia-avatar">
              <AviaAvatar />
            </div>
            {/* Glow verde pulsante detrás del avatar */}
            <div className="avia-glow" />
            {/* Anillo que se expande cuando hay alertas activas */}
            {hasAlerts && <span className="avia-ring" />}
          </>
        )}
        {/* Badge rojo con conteo de mensajes sin leer */}
        {!chatOpen && unread > 0 && <span className="avia-badge">{unread}</span>}
      </button>

      {/* Nombre "AVIA" debajo del avatar */}
      {!chatOpen && <span className="avia-label">AVIA</span>}
    </div>
  )
}

export default AviaMascot
