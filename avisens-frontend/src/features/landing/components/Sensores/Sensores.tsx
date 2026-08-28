import { IcThermo, IcDrop, IcScale, IcEye, IcWind } from '@shared/ui/icons/icons'
import dht22 from '../../assets/sensores/dht22-600x600.jpg'
import hx711 from '../../assets/sensores/HX711.jpg'
import ky032 from '../../assets/sensores/KY-032.jpg'
import mq135 from '../../assets/sensores/MQ-135.jpg'
import hcsr04 from '../../assets/sensores/HC-SR04.jpg'
import './Sensores.css'

// Cada tarjeta muestra un sensor real de los que usa AVISENS en el galpón,
// junto al dato que ese sensor termina mostrando en tu celular — la
// investigación es clara en esto: el hardware solo, sin conectarlo con la
// información que produce, no comunica el valor real del producto.
const sensores = [
  {
    imagen: dht22,
    etiqueta: 'Clima',
    titulo: 'Temperatura y humedad',
    codigo: 'DHT22',
    texto:
      'El DHT22 es un sensor de temperatura y humedad que mide el calor y la humedad del aire en tiempo real para asegurar el clima adecuado en el galpón.',
    lectura: [
      { icono: <IcThermo size={13} />, valor: '27°C' },
      { icono: <IcDrop size={13} />, valor: '68%' },
    ],
  },
  {
    imagen: hx711,
    etiqueta: 'Peso',
    titulo: 'Peso y ganancia de masa',
    codigo: 'HX711',
    texto:
      'La celda de carga con el módulo HX711 es un sensor de peso que mide de forma continua y precisa el peso de los pollos para monitorear su crecimiento y ganancia de masa en el galpón.',
    lectura: [
      { icono: <IcScale size={13} />, valor: '1.85 kg' },
    ],
  },
  {
    imagen: ky032,
    etiqueta: 'Movimiento',
    titulo: 'Detección de movimiento',
    codigo: 'KY-032',
    texto:
      'El KY-032 es un sensor de proximidad por infrarrojos que detecta la presencia o paso de obstáculos y animales a corta distancia para automatizar accesos o registrar movimiento en el galpón.',
    lectura: [
      { icono: <IcEye size={13} />, valor: 'Movimiento detectado' },
    ],
  },
  {
    imagen: mq135,
    etiqueta: 'Aire',
    titulo: 'Calidad del aire',
    codigo: 'MQ-135',
    texto:
      'El MQ-135 es un sensor de calidad del aire que detecta gases nocivos como amoníaco, humo y dióxido de carbono para vigilar la ventilación y la salud del galpón.',
    lectura: [
      { icono: <IcWind size={13} />, valor: 'Aire: Bueno' },
    ],
  },
  {
    imagen: hcsr04,
    etiqueta: 'Agua',
    titulo: 'Nivel de agua',
    codigo: 'HC-SR04',
    texto:
      'El HC-SR04 es un sensor de ultrasonido que mide la distancia mediante ondas sonoras para monitorear el nivel de agua en tanques o bebederos y evitar que se queden vacíos.',
    lectura: [
      { icono: <IcDrop size={13} />, valor: 'Nivel: 82%' },
    ],
  },
]

function Sensores() {
  return (
    <section className="sensores-section">
      <div className="sensores-head">
        <div className="sensores-eyebrow">
          <span className="sensores-eyebrow-line" />
          <span className="sensores-eyebrow-txt">La tecnología por dentro</span>
          <span className="sensores-eyebrow-line" />
        </div>
        <h2 className="sensores-title">Sensores reales, no promesas.</h2>
        <p className="sensores-sub">
          Este es el equipo que realmente se instala en tu galpón para que la información llegue a tu celular.
        </p>
      </div>

      <ul className="sensores-grid">
        {sensores.map(({ imagen, etiqueta, titulo, codigo, texto, lectura }, indice) => (
          <li key={codigo} className="sensor-card">
            <div className="sensor-card-foto">
              <span className="sensor-card-tag">{etiqueta}</span>
              <img src={imagen} alt={titulo} loading="lazy" />
            </div>
            <div className="sensor-card-body">
              <h3 className="sensor-card-titulo">{titulo}</h3>
              <p className="sensor-card-texto">{texto}</p>

              <div className="sensor-card-puente">
                <span className="sensor-card-puente-txt">Así se ve en tu celular</span>
                <div className="sensor-card-lectura">
                  {lectura.map(({ icono, valor }, i) => (
                    <span key={i} className="sensor-card-lectura-chip">
                      {icono} {valor}
                    </span>
                  ))}
                </div>
              </div>

              <div className="sensor-card-footer">
                <span className={`sensor-card-punto sensor-card-punto--${indice % 3}`} />
                <span className="sensor-card-codigo">{codigo}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Sensores
