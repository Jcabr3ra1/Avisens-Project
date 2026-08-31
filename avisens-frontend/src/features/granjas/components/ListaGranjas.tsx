import { useState, type MouseEvent } from 'react'
import { IcPin } from '@shared/ui/icons/icons'
import type { Granja } from '../api/granjas'
import MenuAcciones from './MenuAcciones'

interface Props {
  granjas: Granja[]
  onEditar: (granja: Granja) => void
  onAlternar: (granja: Granja) => void
  onEliminar: (granja: Granja) => void
  onVerGalpones: (granja: Granja) => void
  puedeGestionar: boolean
}

interface MenuGranja {
  granja: Granja
  top: number
  left: number
}

function ListaGranjas({ granjas, onEditar, onAlternar, onEliminar, onVerGalpones, puedeGestionar }: Props) {
  const [menu, setMenu] = useState<MenuGranja | null>(null)

  function abrirMenu(evento: MouseEvent<HTMLButtonElement>, granja: Granja) {
    const rectangulo = evento.currentTarget.getBoundingClientRect()
    setMenu({ granja, top: rectangulo.bottom + 4, left: rectangulo.right - 152 })
  }

  if (granjas.length === 0) return <p className="grj-vacio">No hay granjas registradas.</p>

  return (
    <>
      <section className="grj-lista" aria-label="Granjas registradas">
        {granjas.map((granja) => (
          <article key={granja.id} className={`grj-card${granja.activa ? '' : ' grj-card--inactiva'}`}>
            <div className="grj-card-info">
              <div>
                <h2>{granja.nombre}</h2>
                {!granja.activa && <span className="grj-estado">Inactiva</span>}
              </div>
              <p><IcPin size={14} aria-hidden="true" /> {granja.municipio ?? '—'}, {granja.departamento ?? '—'}</p>
              {granja.direccion && <p>{granja.direccion}</p>}
            </div>
            <div className="grj-card-meta">
              <span>{granja.area_total_m2 !== null ? `${granja.area_total_m2.toLocaleString()} m²` : 'Área sin registrar'}</span>
              <button type="button" className="grj-ver-hijos" onClick={() => onVerGalpones(granja)}>Ver galpones</button>
              {puedeGestionar && (
                <button type="button" className="grj-menu-btn" onClick={(evento) => abrirMenu(evento, granja)} aria-label={`Acciones de la granja ${granja.nombre}`}>⋯</button>
              )}
            </div>
          </article>
        ))}
      </section>

      {menu && puedeGestionar && (
        <MenuAcciones
          top={menu.top}
          left={menu.left}
          activo={menu.granja.activa}
          nombreEntidad={`la granja ${menu.granja.nombre}`}
          onCerrar={() => setMenu(null)}
          onEditar={() => { onEditar(menu.granja); setMenu(null) }}
          onAlternar={() => { onAlternar(menu.granja); setMenu(null) }}
          onEliminar={() => { onEliminar(menu.granja); setMenu(null) }}
        />
      )}
    </>
  )
}

export default ListaGranjas
