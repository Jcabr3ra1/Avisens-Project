import './CoopShowcase.css'

type SensorKind = 'sensor' | 'fan' | 'food' | 'water' | 'access'

type Sensor = {
  id: string
  kind: SensorKind
  label: string
  desc: string
}

const SENSORS_LEFT: Sensor[] = [
  {
    id: 'temp',
    kind: 'sensor',
    label: 'Temperatura',
    desc: 'Detecta variaciones de calor por zona y activa la ventilación cuando supera el rango óptimo.',
  },
  {
    id: 'acceso',
    kind: 'access',
    label: 'Acceso',
    desc: 'Registra entradas y salidas con sensores en puertas principales y de servicio.',
  },
  {
    id: 'alimento',
    kind: 'food',
    label: 'Alimento',
    desc: 'Reporta consumo y nivel en cada línea de comederos, día a día.',
  },
]

const SENSORS_RIGHT: Sensor[] = [
  {
    id: 'ventilacion',
    kind: 'fan',
    label: 'Ventilación',
    desc: 'Controla los extractores y mantiene el aire fresco según temperatura y niveles de CO₂.',
  },
  {
    id: 'humedad',
    kind: 'sensor',
    label: 'Humedad',
    desc: 'Mide la humedad ambiente para prevenir enfermedades respiratorias y proteger al lote.',
  },
  {
    id: 'agua',
    kind: 'water',
    label: 'Agua',
    desc: 'Mide flujo y volumen para detectar fugas o consumo anormal en tiempo real.',
  },
]

const iconBase = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const getIcon = (kind: SensorKind) => {
  switch (kind) {
    case 'fan':
      return (
        <svg {...iconBase}>
          <circle cx="12" cy="12" r="1.7" />
          <path d="M12 4.5c-.6 2.5-.6 4.4 0 5.6.6 1.2 2.3 1.8 5 1.6 0 2.4-1 4-3 5.2-2-.4-3.6-1.5-4.6-3.2-1 1.8-2.6 2.8-4.6 3.2-2-1.2-3-2.8-3-5.2 2.7.2 4.4-.4 5-1.6.6-1.2.6-3.1 0-5.6Z" />
        </svg>
      )
    case 'food':
      return (
        <svg {...iconBase}>
          <path d="M7 6h10l-1 3H8L7 6Z" />
          <path d="M8 9l1.5 10.5h5L16 9" />
        </svg>
      )
    case 'water':
      return (
        <svg {...iconBase}>
          <path d="M12 3.5c3.5 4 6 7.3 6 10.5a6 6 0 1 1-12 0c0-3.2 2.5-6.5 6-10.5Z" />
        </svg>
      )
    case 'access':
      return (
        <svg {...iconBase}>
          <path d="M4 9h11a2.5 2.5 0 1 0-2.5-2.5" />
          <path d="M4 14h15a2.5 2.5 0 1 1-2.5 2.5" />
          <path d="M4 12h7" />
        </svg>
      )
    default:
      return (
        <svg {...iconBase}>
          <path d="M10 4.5a2 2 0 1 1 4 0v8.7a3.5 3.5 0 1 1-4 0V4.5Z" />
          <path d="M12 8v6" />
        </svg>
      )
  }
}

const SensorCard = ({ sensor }: { sensor: Sensor }) => (
  <li className="coop-showcase-sensor">
    <span className="coop-showcase-sensor-icon">{getIcon(sensor.kind)}</span>
    <div className="coop-showcase-sensor-text">
      <h4 className="coop-showcase-sensor-title">{sensor.label}</h4>
      <p className="coop-showcase-sensor-desc">{sensor.desc}</p>
    </div>
  </li>
)

function CoopShowcase() {
  return (
    <div className="coop-showcase">
      <div className="coop-showcase-grid">
        <ul className="coop-showcase-sensors side-left" aria-label="Sensores del galpón (izquierda)">
          {SENSORS_LEFT.map((s) => (
            <SensorCard key={s.id} sensor={s} />
          ))}
        </ul>

        <div className="coop-showcase-image-wrap">
          <img
            className="coop-showcase-image"
            src="/assets/galpon.png"
            alt="Galpón con sensores AVISENS"
            draggable={false}
          />
        </div>

        <ul className="coop-showcase-sensors side-right" aria-label="Sensores del galpón (derecha)">
          {SENSORS_RIGHT.map((s) => (
            <SensorCard key={s.id} sensor={s} />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default CoopShowcase
