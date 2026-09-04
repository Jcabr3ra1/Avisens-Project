import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type Miga = {
  label: string
  to?: string
}

interface Props {
  eyebrow?: string
  titulo: string
  contexto?: string
  subtitulo: string
  migas?: Miga[]
  acciones?: ReactNode
}

function CabeceraAdmin({
  eyebrow = 'Panel de administración',
  titulo,
  contexto,
  subtitulo,
  migas,
  acciones,
}: Props) {
  return (
    <header className="adm-cabecera">
      <div className="adm-cabecera-fila">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            {eyebrow}
          </span>
          <h1 className="adm-titulo">
            {titulo}
            {contexto && <span className="adm-titulo-contexto"> · {contexto}</span>}
          </h1>
          <p className="adm-subtitulo">{subtitulo}</p>
        </div>
        {acciones && <div className="adm-cabecera-acciones">{acciones}</div>}
      </div>

      {migas && migas.length > 0 && (
        <nav className="adm-migas" aria-label="Ruta de navegación">
          {migas.map((miga, indice) => (
            <span key={`${miga.label}-${indice}`} style={{ display: 'contents' }}>
              {indice > 0 && (
                <span className="adm-miga-sep" aria-hidden="true">
                  ›
                </span>
              )}
              {miga.to ? (
                <Link className="adm-miga" to={miga.to}>
                  {miga.label}
                </Link>
              ) : (
                <span className="adm-miga adm-miga--actual" aria-current="page">
                  {miga.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
    </header>
  )
}

export default CabeceraAdmin
