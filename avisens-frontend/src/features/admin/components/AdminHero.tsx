import BannerSaludo from '@shared/ui/BannerSaludo/BannerSaludo'
import { saludoSegunHora } from '@shared/ui/BannerSaludo/saludo'
import IconoFigma from '@shared/ui/icons/IconoFigma'
import type { PeriodoDias } from '../model/metricas'
import SelectorPeriodo from './SelectorPeriodo'

type Props = {
  nombre: string
  fecha: string
  sincronizando: boolean
  onSincronizar: () => void
  periodo: PeriodoDias
  onCambiarPeriodo: (dias: PeriodoDias) => void
}

function AdminHero({ nombre, fecha, sincronizando, onSincronizar, periodo, onCambiarPeriodo }: Props) {
  const saludo = saludoSegunHora()

  return (
    <BannerSaludo
      fecha={fecha}
      contexto="Centro de control · AVISENS"
      titulo={nombre ? `${saludo}, ${nombre}` : saludo}
      subtitulo="Esto es lo que pasa hoy en la plataforma."
      acciones={(
        <>
          <SelectorPeriodo valor={periodo} onCambiar={onCambiarPeriodo} />
          <button
            type="button"
            className={`bs-btn${sincronizando ? ' is-girando' : ''}`}
            onClick={onSincronizar}
            disabled={sincronizando}
          >
            <IconoFigma nombre="actualizar" tamano={15} />
            <span>{sincronizando ? 'Actualizando…' : 'Actualizar datos'}</span>
          </button>
        </>
      )}
    />
  )
}

export default AdminHero
