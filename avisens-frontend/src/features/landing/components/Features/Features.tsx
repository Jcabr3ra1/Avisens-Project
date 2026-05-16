import Ic from '@shared/ui/Ic/Ic'
import { useFadeUp } from '@shared/hooks/useFadeUp'
import './Features.css'

const iconPaths: Record<string, string | string[]> = {
  wifi: ['M5 12.55a11 11 0 0114.08 0', 'M1.42 9a16 16 0 0121.16 0', 'M8.53 16.11a6 6 0 016.95 0', 'M12 20h.01'],
  act: 'M22 12h-4l-3 9L9 3l-3 9H2',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  chart: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  phone: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.14A16 16 0 0015.86 17.1l1.41-1.41a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  users: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 7a4 4 0 100 8 4 4 0 000-8z', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  bot: ['M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'],
}

const feats = [
  { icon: iconPaths.wifi, color: '#e8a020', bg: 'rgba(232,160,32,.2)', title: 'IoT con sensores accesibles', desc: 'Kit ESP32 + sensores desde $15-20 USD por galpón. Sin hardware propietario ni contratos costosos.' },
  { icon: iconPaths.act, color: '#10b981', bg: 'rgba(16,185,129,.15)', title: 'Health Score™ exclusivo', desc: 'Una métrica de 0-100 que combina todas las variables. Entiende tu granja en un vistazo.' },
  { icon: iconPaths.zap, color: '#f59e0b', bg: 'rgba(16,185,129,.15)', title: 'Automatización real', desc: 'Reglas que controlan ventiladores, comederos e iluminación según CO₂, temperatura y humedad.' },
  { icon: iconPaths.chart, color: '#10b981', bg: 'rgba(16,185,129,.15)', title: 'Curvas de crecimiento', desc: 'Compara peso real vs curva estándar Ross 308, Cobb 500 o Hubbard. Detecta desviaciones.' },
  { icon: iconPaths.dollar, color: '#10b981', bg: 'rgba(16,185,129,.15)', title: 'Panel financiero completo', desc: 'FCR en tiempo real, costo/ave, proyección de ganancias y comparativa de ciclos históricos.' },
  { icon: iconPaths.phone, color: '#10b981', bg: 'rgba(16,185,129,.15)', title: 'Alertas por WhatsApp', desc: 'El avicultor colombiano vive en WhatsApp. Nosotros también. Alertas críticas directo a tu celular.' },
  { icon: iconPaths.shield, color: '#f59e0b', bg: 'rgba(16,185,129,.15)', title: 'Trazabilidad de lote', desc: 'Del día 1 al rastro: origen, vacunas, medicamentos, mortalidad. Genera el Pasaporte del Lote en PDF.' },
  { icon: iconPaths.users, color: '#10b981', bg: 'rgba(16,185,129,.15)', title: 'Multi-rol y multi-granja', desc: '4 roles diferenciados y soporte multi-granja. Escala de 1 a 50 galpones sin cambiar de plataforma.' },
  { icon: iconPaths.bot, color: '#e8a020', bg: 'rgba(232,160,32,.2)', title: 'Asistente IA AVIA', desc: 'Pregunta en español natural: "¿Cómo está el galpón 2?" y obtén respuestas con tus datos reales.' },
]

function Features() {
  const ref = useFadeUp()

  return (
    <section id="features" className="features-section">
      <div className="max-w fade-up" ref={ref}>
        <div className="section-label">Funcionalidades</div>
        <h2 className="section-title">
          Todo lo que una granja
          <br />
          <span className="grad-text">profesional necesita</span>
        </h2>
        <p className="section-sub">
          Desde sensores IoT hasta inteligencia artificial — una plataforma completa para el avicultor latinoamericano.
        </p>
        <div className="features-grid">
          {feats.map(({ icon, color, bg, title, desc }, index) => (
            <div key={title} className="feat-card" data-index={`0${index + 1}`}>
              <div className="feat-icon" style={{ background: bg, border: `1px solid ${color}33` }}>
                <Ic d={icon} size={20} style={{ color }} />
              </div>
              <div className="feat-title">{title}</div>
              <div className="feat-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
