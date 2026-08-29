import './Footer.css'
import logoAvisens from '@shared/assets/logo-avisens.png'

const CX = 110

function Hoja({
  y,
  lado,
  escala,
  tono,
  giro = 0,
  gota = false,
}: {
  y: number
  lado: 1 | -1
  escala: number
  tono: string
  giro?: number
  gota?: boolean
}) {
  const w = 122 * escala
  const caida = 30 * escala
  const grad = `url(#hoja${tono === 'oscura' ? 'Oscura' : 'Clara'}${lado === 1 ? 'R' : 'L'})`
  // filo delantero con una leve ondulación (sube, se nivela, y remata en punta) y una base angosta al volver
  const d =
    `M${CX} ${y}` +
    `C ${CX + lado * w * 0.18} ${y - 15 * escala} ${CX + lado * w * 0.44} ${y - 5 * escala} ${CX + lado * w * 0.6} ${y + 8 * escala}` +
    `C ${CX + lado * w * 0.8} ${y + 18 * escala} ${CX + lado * w * 0.94} ${y + caida * 0.66} ${CX + lado * w} ${y + caida}` +
    `C ${CX + lado * w * 0.68} ${y + caida - 3} ${CX + lado * w * 0.26} ${y + 14 * escala} ${CX} ${y + 7 * escala} Z`
  // copia mas chica y oscura detras, como si hubiera otra hoja envolviendo desde abajo
  const dSombra =
    `M${CX} ${y + 2 * escala}` +
    `C ${CX + lado * w * 0.16} ${y - 10 * escala} ${CX + lado * w * 0.4} ${y} ${CX + lado * w * 0.52} ${y + 12 * escala}` +
    `C ${CX + lado * w * 0.7} ${y + 20 * escala} ${CX + lado * w * 0.8} ${y + caida * 0.6} ${CX + lado * w * 0.86} ${y + caida * 0.9}` +
    `C ${CX + lado * w * 0.58} ${y + caida * 0.8} ${CX + lado * w * 0.24} ${y + 16 * escala} ${CX} ${y + 9 * escala} Z`
  const nervadura =
    `M${CX} ${y + 3 * escala} Q ${CX + lado * w * 0.5} ${y + 8 * escala} ${CX + lado * w * 0.88} ${y + caida - 6}`
  const brillo =
    `M${CX + lado * w * 0.1} ${y - 5 * escala} Q ${CX + lado * w * 0.46} ${y - 3 * escala} ${CX + lado * w * 0.62} ${y + caida - 16}`
  // venas secundarias, mas cortas, saliendo de la nervadura central
  const venas = [0.3, 0.5, 0.7].map(
    (t) =>
      `M${CX + lado * w * t} ${y + (3 + t * (caida - 6)) * escala * 0.6 + t * 3}` +
      `l${lado * w * 0.1} ${6 * escala}`,
  )
  const gotaCx = CX + lado * w * 0.72
  const gotaCy = y + caida * 0.55
  return (
    <g transform={`rotate(${giro} ${CX} ${y})`}>
      <path d={dSombra} fill="rgba(18,45,20,0.4)" />
      {/* cuello/vaina: donde la hoja envuelve el tallo */}
      <ellipse
        cx={CX + lado * 3 * escala}
        cy={y + 4 * escala}
        rx={7 * escala}
        ry={2.6 * escala}
        fill="#2f6a35"
        opacity="0.55"
      />
      <path d={d} fill={grad} stroke="#2f6a35" strokeWidth={0.9 * escala} strokeLinejoin="round" />
      <path d={brillo} stroke="rgba(255,255,255,0.32)" strokeWidth={0.9 * escala} fill="none" strokeLinecap="round" />
      <path d={nervadura} stroke="rgba(16,40,16,0.25)" strokeWidth={1.1 * escala} fill="none" strokeLinecap="round" />
      {venas.map((v, i) => (
        <path key={i} d={v} stroke="rgba(16,40,16,0.16)" strokeWidth={0.7 * escala} fill="none" strokeLinecap="round" />
      ))}
      {gota && (
        <>
          <ellipse cx={gotaCx} cy={gotaCy} rx={2.6 * escala} ry={3.2 * escala} fill="rgba(230,248,255,0.55)" />
          <ellipse cx={gotaCx - 0.6 * escala} cy={gotaCy - 1 * escala} rx={0.7 * escala} ry={0.9 * escala} fill="rgba(255,255,255,0.85)" />
        </>
      )}
    </g>
  )
}

function Mazorca({
  x,
  y,
  angulo,
  escala,
  id,
  matiz = 0,
}: {
  x: number
  y: number
  angulo: number
  escala: number
  id: string
  matiz?: number
}) {
  const filas = [79, 84, 89]
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${angulo}) scale(${escala})`}
      style={matiz ? { filter: `hue-rotate(${matiz}deg)` } : undefined}
    >
      <clipPath id={id}>
        <ellipse cx="0" cy="50" rx="15" ry="45" />
      </clipPath>
      <ellipse cx="0" cy="50" rx="15" ry="45" fill="url(#kernelGrad)" stroke="#c9891c" strokeWidth="1" />
      <g clipPath={`url(#${id})`}>
        {filas.map((cy, r) => (
          <g key={cy}>
            {[-8, -3, 2, 7].map((cx, c) => (
              <circle
                key={cx}
                cx={cx + (r % 2 ? 2 : 0)}
                cy={cy}
                r="1.6"
                fill={(r + c) % 2 ? '#c9891c' : '#b97a12'}
              />
            ))}
          </g>
        ))}
        <ellipse cx="-4" cy="82" rx="4" ry="7" fill="rgba(255,255,255,0.35)" />
      </g>
      {/* chala envolviendo la base y el cuerpo, remata en punta y deja la mazorca al descubierto */}
      <path
        d="M-2 0C-17 24-19 58-13 82C-7 60-3 26 1 0Z"
        fill="#3f8a45"
        stroke="#2f6a35"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M-4 10C-13 32-14 54-10 74" stroke="rgba(16,40,16,0.3)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path
        d="M2 0C17 22 19 56 12 80C6 58 2 24-1 0Z"
        fill="#6bbf5e"
        stroke="#2f6a35"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M4 8C12 28 13 52 8 72" stroke="rgba(16,40,16,0.28)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* seda saliendo de la punta, dos tonos para dar volumen */}
      <g strokeLinecap="round" fill="none">
        <path d="M-6 87C-9 98-6 108-12 120" stroke="#8a6a3a" strokeWidth="1.3" />
        <path d="M-4 88C-6 100-2 112-8 125" stroke="#a6824a" strokeWidth="1.6" />
        <path d="M0 90C0 102 3 114 0 128" stroke="#c9a76b" strokeWidth="1.5" />
        <path d="M4 88C7 100 3 112 9 124" stroke="#a6824a" strokeWidth="1.6" />
        <path d="M6 87C10 97 7 107 13 119" stroke="#8a6a3a" strokeWidth="1.3" />
      </g>
    </g>
  )
}

function Espiga({ angulo, largo, arco = 0 }: { angulo: number; largo: number; arco?: number }) {
  return (
    <g transform={`rotate(${angulo} ${CX} 55)`}>
      <path
        d={`M${CX} 55C${CX - arco * 0.35} ${55 - largo * 0.4} ${CX - arco * 0.75} ${55 - largo * 0.75} ${CX - arco} ${55 - largo}`}
        stroke="#a98a3f"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {[0.28, 0.48, 0.68, 0.86].map((t, i) => {
        const fx = CX - arco * t
        const fy = 55 - largo * t
        return (
          <g key={t}>
            <path d={`M${fx - 3} ${fy}l-2.4-2.2M${fx + 3} ${fy}l2.4-2.2`} stroke="#8a6a3a" strokeWidth="0.6" strokeLinecap="round" />
            <ellipse cx={fx} cy={fy} rx={1.8 + i * 0.3} ry={3.2 + i * 0.4} fill="#d9c16f" stroke="#a98a3f" strokeWidth="0.5" />
          </g>
        )
      })}
    </g>
  )
}

function Raiz({
  dx,
  dy,
  grosor,
  color,
  hijos,
}: {
  dx: number
  dy: number
  grosor: number
  color: string
  hijos?: { t: number; dx: number; dy: number }[]
}) {
  const bx = 110 + dx
  const by = 430 + dy
  const d = `M110 430C${110 + dx * 0.25} ${430 + dy * 0.4} ${110 + dx * 0.62} ${430 + dy * 0.75} ${bx} ${by}`
  return (
    <g>
      <path d={d} stroke={color} strokeWidth={grosor} strokeLinecap="round" fill="none" />
      {hijos?.map((h, i) => {
        const px = 110 + dx * h.t
        const py = 430 + dy * h.t
        return (
          <path
            key={i}
            d={`M${px} ${py}Q${px + h.dx * 0.6} ${py + h.dy * 0.5} ${px + h.dx} ${py + h.dy}`}
            stroke={color}
            strokeWidth={Math.max(grosor * 0.45, 1)}
            strokeLinecap="round"
            fill="none"
          />
        )
      })}
    </g>
  )
}

const raices: { dx: number; dy: number; grosor: number; color: string; hijos?: { t: number; dx: number; dy: number }[] }[] = [
  {
    dx: -50,
    dy: 34,
    grosor: 3,
    color: '#a97c4a',
    hijos: [
      { t: 0.5, dx: -13, dy: 3 },
      { t: 0.78, dx: -8, dy: 7 },
    ],
  },
  { dx: -32, dy: 41, grosor: 2.8, color: '#b8905c', hijos: [{ t: 0.58, dx: -12, dy: 7 }] },
  { dx: -12, dy: 45, grosor: 2.3, color: '#c9a876', hijos: [{ t: 0.55, dx: -7, dy: 8 }] },
  {
    dx: 0,
    dy: 47,
    grosor: 3.6,
    color: '#a97c4a',
    hijos: [
      { t: 0.42, dx: -9, dy: 4 },
      { t: 0.42, dx: 9, dy: 4 },
      { t: 0.72, dx: -7, dy: 9 },
      { t: 0.72, dx: 7, dy: 9 },
    ],
  },
  { dx: 12, dy: 45, grosor: 2.3, color: '#c9a876', hijos: [{ t: 0.55, dx: 7, dy: 8 }] },
  { dx: 32, dy: 41, grosor: 2.8, color: '#b8905c', hijos: [{ t: 0.58, dx: 12, dy: 7 }] },
  {
    dx: 50,
    dy: 34,
    grosor: 3,
    color: '#a97c4a',
    hijos: [
      { t: 0.5, dx: 13, dy: 3 },
      { t: 0.78, dx: 8, dy: 7 },
    ],
  },
]

const hojas: { y: number; lado: 1 | -1; escala: number; tono: 'oscura' | 'clara'; giro?: number; gota?: boolean }[] = [
  { y: 405, lado: -1, escala: 1.25, tono: 'oscura', giro: -3, gota: true },
  { y: 358, lado: 1, escala: 1.15, tono: 'clara', giro: 4 },
  { y: 306, lado: -1, escala: 1.0, tono: 'oscura', giro: -5, gota: true },
  { y: 259, lado: 1, escala: 0.9, tono: 'clara', giro: 3 },
  { y: 204, lado: -1, escala: 0.8, tono: 'oscura', giro: -4, gota: true },
  { y: 154, lado: 1, escala: 0.7, tono: 'clara', giro: 5 },
  { y: 109, lado: -1, escala: 0.55, tono: 'oscura', giro: -3 },
]

const nudos = [408, 363, 308, 263, 208, 158, 113]

const mazorcas: { y: number; angulo: number; escala: number; matiz: number }[] = [
  { y: 405, angulo: 41, escala: 1.05, matiz: 0 },
  { y: 358, angulo: -55, escala: 0.96, matiz: 6 },
  { y: 306, angulo: 48, escala: 0.86, matiz: -7 },
  { y: 259, angulo: -38, escala: 0.76, matiz: 5 },
  { y: 204, angulo: 56, escala: 0.66, matiz: -5 },
  { y: 154, angulo: -50, escala: 0.58, matiz: 7 },
  { y: 109, angulo: 36, escala: 0.44, matiz: -4 },
]

function MataDeMaiz() {
  return (
    <svg className="footer-corn" viewBox="-48 0 306 480" aria-hidden="true">
      <defs>
        <linearGradient id="hojaOscuraR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f7a38" />
          <stop offset="100%" stopColor="#4fa356" />
        </linearGradient>
        <linearGradient id="hojaOscuraL" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f7a38" />
          <stop offset="100%" stopColor="#4fa356" />
        </linearGradient>
        <linearGradient id="hojaClaraR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a9c4f" />
          <stop offset="100%" stopColor="#7bc96f" />
        </linearGradient>
        <linearGradient id="hojaClaraL" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a9c4f" />
          <stop offset="100%" stopColor="#7bc96f" />
        </linearGradient>
        <linearGradient id="talloGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3f8a45" />
          <stop offset="100%" stopColor="#6bbf5e" />
        </linearGradient>
        <linearGradient id="kernelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe17a" />
          <stop offset="100%" stopColor="#e2a324" />
        </linearGradient>
        <filter id="sombraMaiz" x="-40%" y="-20%" width="180%" height="140%">
          <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="#0a1e0a" floodOpacity="0.22" />
        </filter>
      </defs>

      <ellipse cx={CX} cy="470" rx="66" ry="7" fill="rgba(16,40,16,0.08)" />

      {/* pasto al pie de la mata */}
      <g stroke="#5c9a4a" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M52 472C50 462 54 455 51 446" />
        <path d="M62 474C64 465 60 458 64 449" />
        <path d="M150 473C152 463 148 456 152 447" />
        <path d="M164 471C162 461 167 454 163 445" />
        <path d="M36 468C34 460 38 454 35 447" />
        <path d="M180 469C182 461 178 455 181 448" />
      </g>

      <g filter="url(#sombraMaiz)">
        {/* raíces */}
        <g>
          {raices.map((r, i) => (
            <Raiz key={i} {...r} />
          ))}
        </g>

        {/* tallo */}
        <path
          d="M104 430C106 300 108 160 109.5 56L110.5 56C112 160 114 300 116 430Z"
          fill="url(#talloGrad)"
          stroke="#2f6a35"
          strokeWidth="1"
        />
        <path
          d="M106.5 425C108 300 109 170 109.8 60"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M113.5 425C112.3 300 111.3 170 110.6 60"
          stroke="rgba(10,30,10,0.22)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        {nudos.map((ny) => (
          <ellipse key={ny} cx={CX} cy={ny} rx="6.5" ry="1.8" fill="#3f7a3f" opacity="0.5" />
        ))}

        {/* hojas */}
        {hojas.map((h) => (
          <Hoja key={h.y} {...h} />
        ))}

        {/* mazorcas: una por cada hoja */}
        {mazorcas.map((m, i) => (
          <Mazorca key={i} x={110} y={m.y} angulo={m.angulo} escala={m.escala} id={`mazorca-${i}`} matiz={m.matiz} />
        ))}

        {/* penacho */}
        <Espiga angulo={-42} largo={38} arco={-7} />
        <Espiga angulo={-20} largo={46} arco={-4} />
        <Espiga angulo={0} largo={58} arco={0} />
        <Espiga angulo={20} largo={46} arco={4} />
        <Espiga angulo={42} largo={38} arco={7} />
      </g>
    </svg>
  )
}

const footerGroups = [
  {
    title: 'Producto',
    links: [
      ['Cómo ayuda', '#beneficios'],
    ],
  },
  {
    title: 'Contacto',
    links: [
      ['Contáctanos', 'https://wa.me/573022358210?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20AVISENS'],
      ['Ingresar', '/login'],
    ],
  },
]

function Footer() {
  return (
    <footer className="site-footer">
      <MataDeMaiz />
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-head">
              <span className="footer-logo-mark">
                <img src={logoAvisens} alt="" />
              </span>
              <span>
                <strong>AVISENS</strong>
                <small>La app que cuida tu granja contigo</small>
              </span>
            </div>
            <p>
              Te avisa a tiempo, te ayuda a llevar las cuentas de la granja y te deja decidir con la cabeza fría — todo desde el celular.
            </p>
            <div className="footer-meta">
              <span>Colombia</span>
              <span>LATAM 2026</span>
            </div>
          </div>
          {footerGroups.map(({ title, links }) => (
            <div key={title} className="footer-col">
              <div className="footer-col-title">{title}</div>
              <ul className="footer-links">
                {links.map(([label, href]) => (
                  <li key={label}><a href={href}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 AVISENS. Todos los derechos reservados.</div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
