import BannerSaludo from '@shared/ui/BannerSaludo/BannerSaludo'
import { saludoSegunHora } from '@shared/ui/BannerSaludo/saludo'
import type { PeriodoDias } from '../model/metricas'
import SelectorPeriodo from './SelectorPeriodo'

type Props = {
  nombre: string
  fecha: string
  periodo: PeriodoDias
  onCambiarPeriodo: (dias: PeriodoDias) => void
}

function AdminHero({ nombre, fecha, periodo, onCambiarPeriodo }: Props) {
  const saludo = saludoSegunHora()

  return (
    <BannerSaludo
      fecha={fecha}
      contexto="Centro de control · AVISENS"
      titulo={nombre ? `${saludo}, ${nombre}` : saludo}
      subtitulo="Esto es lo que pasa hoy en la plataforma."
      acciones={<SelectorPeriodo valor={periodo} onCambiar={onCambiarPeriodo} />}
    />
  )
}

export default AdminHero
