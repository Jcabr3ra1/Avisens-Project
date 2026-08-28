import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IcThermo, IcBox, IcChart, IcChat, IcPhone, IcHeart } from '@shared/ui/icons/icons'
import './Beneficios.css'

const beneficios: { icono: ReactNode; titulo: string; texto: string }[] = [
  {
    icono: <IcThermo size={22} />,
    titulo: 'Te avisa antes de que sea tarde',
    texto:
      'Si el calor, el frío o la humedad del galpón se salen de lo normal, te llega un aviso al momento. No tienes que estar pendiente todo el día.',
  },
  {
    icono: <IcBox size={22} />,
    titulo: 'La bodega, sin cuadernos ni hojas sueltas',
    texto:
      'Sabes cuánta comida, agua y medicina te queda y cuándo se te va a acabar, sin anotar nada a mano.',
  },
  {
    icono: <IcChart size={22} />,
    titulo: 'Ve cómo van creciendo tus aves',
    texto:
      'El peso, los días de vida y cómo va cada lote, todo en un solo lugar y fácil de entender de un vistazo.',
  },
  {
    icono: <IcChat size={22} />,
    titulo: 'Háblale a AVIA como a un compañero',
    texto:
      'Le preguntas por escrito o por voz — "¿cómo va el galpón 2?" — y te responde al momento, sin buscar nada.',
  },
  {
    icono: <IcPhone size={22} />,
    titulo: 'Todo desde tu celular',
    texto:
      'No necesitas un computador ni saber de tecnología. Entras desde el celular y ves tu granja completa.',
  },
  {
    icono: <IcHeart size={22} />,
    titulo: 'Cuida la salud de tus lotes',
    texto:
      'Registra enfermedades, muertes y plagas, y el sistema te ayuda a notar los problemas antes de que crezcan.',
  },
]

function Beneficios() {
  const gridRef = useRef<HTMLUListElement>(null)
  const [visible, setVisible] = useState(false)

  // Las tarjetas aparecen suavemente la primera vez que entran en pantalla —
  // una sola observación para toda la cuadrícula, no una por tarjeta.
  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="beneficios-section" id="beneficios">
      <div className="beneficios-head">
        <div className="beneficios-eyebrow">
          <span className="beneficios-eyebrow-line" />
          <span className="beneficios-eyebrow-txt">Cómo te ayuda AVISENS</span>
          <span className="beneficios-eyebrow-line" />
        </div>
        <h2 className="beneficios-title">
          Todo lo que necesitas para cuidar tu granja, en un solo lugar.
        </h2>
      </div>

      <ul ref={gridRef} className={`beneficios-grid${visible ? ' is-visible' : ''}`}>
        {beneficios.map(({ icono, titulo, texto }, indice) => (
          <li
            key={titulo}
            className="beneficio-card"
            style={{ transitionDelay: `${indice * 70}ms` }}
          >
            <span className="beneficio-card-icono">{icono}</span>
            <h3 className="beneficio-card-titulo">{titulo}</h3>
            <p className="beneficio-card-texto">{texto}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Beneficios
