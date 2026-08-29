import { IcRefresh } from '@shared/ui/icons/icons'

type Props = {
  nombre: string
  cargando: boolean
  onRecargar: () => void
}

function EncabezadoJornada({ nombre, cargando, onRecargar }: Props) {
  return (
    <header className="operario-head">
      <div>
        <p className="operario-eyebrow">Mi jornada</p>
        <h1>Hola, {nombre}</h1>
        <p>Registra lo que sucede hoy en los galpones a tu cargo.</p>
      </div>
      <button
        type="button"
        className="operario-btn-refresh"
        onClick={onRecargar}
        disabled={cargando}
      >
        <IcRefresh size={17} />
        {cargando ? 'Actualizando…' : 'Actualizar'}
      </button>
    </header>
  )
}

export default EncabezadoJornada
