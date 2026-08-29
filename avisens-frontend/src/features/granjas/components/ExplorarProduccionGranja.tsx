import { Link } from 'react-router-dom'
import { IcChevronRight, IcEgg, IcGrid } from '@shared/ui/icons/icons'

function ExplorarProduccionGranja() {
  return (
    <section className="grj-produccion" aria-labelledby="grj-produccion-titulo">
      <div className="grj-produccion-cabecera">
        <div>
          <p className="grj-produccion-kicker">Organización productiva</p>
          <h2 id="grj-produccion-titulo">Continúa con la estructura de tu granja</h2>
          <p>Primero registra la granja. Después agrega sus galpones y los lotes que estarán alojados en ellos.</p>
        </div>
      </div>

      <div className="grj-produccion-opciones">
        <Link className="grj-produccion-opcion" to="/galpones">
          <span className="grj-produccion-icono grj-produccion-icono--galpon" aria-hidden="true"><IcGrid size={22} /></span>
          <span className="grj-produccion-texto">
            <strong>Galpones</strong>
            <span>Define los espacios físicos y su capacidad.</span>
          </span>
          <IcChevronRight className="grj-produccion-flecha" size={18} aria-hidden="true" />
        </Link>

        <Link className="grj-produccion-opcion" to="/lotes">
          <span className="grj-produccion-icono grj-produccion-icono--lote" aria-hidden="true"><IcEgg size={22} /></span>
          <span className="grj-produccion-texto">
            <strong>Lotes</strong>
            <span>Registra las aves y asígnalas a un galpón.</span>
          </span>
          <IcChevronRight className="grj-produccion-flecha" size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

export default ExplorarProduccionGranja
