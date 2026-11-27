import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import { IcAlert, IcDrop, IcScale, IcSeed } from '@shared/ui/icons/icons'
import type { ResumenBitacora, VistaBitacora } from '../model/resumenBitacora'

type Props = {
  resumen: ResumenBitacora
  vistaActiva?: VistaBitacora
  onSeleccionarVista?: (vista: VistaBitacora) => void
}

function ResumenLote({ resumen, vistaActiva, onSeleccionarVista }: Props) {
  const indicadores = [
    {
      etiqueta: 'Último peso',
      valor: resumen.ultimoPeso ? formatearPeso(resumen.ultimoPeso.peso_promedio_g) : 'Sin dato',
      ayuda: resumen.ultimoPeso ? 'Promedio más reciente' : 'Aún sin pesajes',
      icono: IcScale,
      tono: 'primario',
      destino: 'peso' as VistaBitacora,
    },
    {
      etiqueta: 'Mortalidad',
      valor: `${resumen.avesMuertas.toLocaleString('es-CO')} aves`,
      ayuda: resumen.avesMuertas > 0 ? 'Bajas acumuladas' : 'Sin bajas registradas',
      icono: IcAlert,
      tono: resumen.avesMuertas > 0 ? 'alerta' : 'ok',
      destino: 'mortalidad' as VistaBitacora,
    },
    {
      etiqueta: 'Alimento',
      valor: `${resumen.alimentoKg.toLocaleString('es-CO')} kg`,
      ayuda: 'Acumulado en consumos',
      icono: IcSeed,
      tono: 'ok',
      destino: 'consumo' as VistaBitacora,
    },
    {
      etiqueta: 'Agua',
      valor: `${resumen.aguaLitros.toLocaleString('es-CO')} L`,
      ayuda: 'Acumulado en consumos',
      icono: IcDrop,
      tono: 'info',
      destino: 'consumo' as VistaBitacora,
    },
  ] as const

  return (
    <section className="bit-kpis" aria-label="Resumen del lote">
      {indicadores.map((indicador) => {
        const Icono = indicador.icono
        const activo = vistaActiva === indicador.destino
        const esInteractivo = Boolean(onSeleccionarVista)

        if (esInteractivo) {
          return (
            <button
              key={indicador.etiqueta}
              type="button"
              className={`bit-kpi bit-kpi--${indicador.tono}${activo ? ' is-activo' : ''}`}
              onClick={() => onSeleccionarVista?.(indicador.destino)}
              aria-pressed={activo}
            >
              <span className="bit-kpi-cab">
                <span className="bit-kpi-etiqueta">{indicador.etiqueta}</span>
                <span className="bit-kpi-icono" aria-hidden="true">
                  <Icono size={15} />
                </span>
              </span>
              <strong>{indicador.valor}</strong>
              <small>{indicador.ayuda}</small>
            </button>
          )
        }

        return (
          <article key={indicador.etiqueta} className={`bit-kpi bit-kpi--estatico bit-kpi--${indicador.tono}`}>
            <span className="bit-kpi-cab">
              <span className="bit-kpi-etiqueta">{indicador.etiqueta}</span>
              <span className="bit-kpi-icono" aria-hidden="true">
                <Icono size={15} />
              </span>
            </span>
            <strong>{indicador.valor}</strong>
            <small>{indicador.ayuda}</small>
          </article>
        )
      })}
    </section>
  )
}

export default ResumenLote
