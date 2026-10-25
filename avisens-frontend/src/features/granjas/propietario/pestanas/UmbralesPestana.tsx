import UmbralesDeGalpon from '@features/galpones/components/UmbralesDeGalpon'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'

type Props = {
  galpon: GalponConLotes
  puedeConfigurar: boolean
}

function UmbralesPestana({ galpon, puedeConfigurar }: Props) {
  return (
    <section className="gp-umbrales" aria-labelledby="gp-umbrales-titulo">
      <header className="gp-umbrales-cabecera">
        <h3 id="gp-umbrales-titulo">Umbrales ambientales</h3>
        <p>
          Los rangos de temperatura, humedad y luz que se esperan cada semana de vida. Con ellos se decide
          si una lectura está bien, en advertencia o en estado crítico.
        </p>
      </header>
      {!puedeConfigurar && (
        <p className="adm-aviso" role="note">
          Vista de solo lectura: la configuración operativa del galpón la hace su propietario.
        </p>
      )}
      <UmbralesDeGalpon galpon={galpon} />
    </section>
  )
}

export default UmbralesPestana
