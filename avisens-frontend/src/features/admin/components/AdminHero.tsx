import IconoFigma from '@shared/ui/icons/IconoFigma'

type Props = {
  nombre: string
  fecha: string
  sincronizando: boolean
  onSincronizar: () => void
}

function AdminHero({ nombre, fecha, sincronizando, onSincronizar }: Props) {
  return (
    <header className="cdc-cabecera">
      <div>
        <h1>Centro de control</h1>
        <p>Hola, {nombre}. Esto es lo que pasa hoy en AVISENS.</p>
      </div>
      <div className="cdc-cabecera-acciones">
        <time>{fecha}</time>
        <button
          type="button"
          className={`cdc-boton-sincronizar${sincronizando ? ' is-girando' : ''}`}
          onClick={onSincronizar}
          disabled={sincronizando}
        >
          <IconoFigma nombre="actualizar" tamano={16} />
          <span>{sincronizando ? 'Actualizando…' : 'Actualizar datos'}</span>
        </button>
      </div>
    </header>
  )
}

export default AdminHero
