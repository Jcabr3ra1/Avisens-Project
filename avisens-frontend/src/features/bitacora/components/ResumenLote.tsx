import { IcDrop, IcHeart, IcScale, IcSeed } from '@shared/ui/icons/icons'
import type { ResumenBitacora } from '../model/resumenBitacora'

type Props = {
  resumen: ResumenBitacora
}

function ResumenLote({ resumen }: Props) {
  const indicadores = [
    {
      etiqueta: 'Último peso',
      valor: resumen.ultimoPeso ? `${resumen.ultimoPeso.peso_promedio_g.toLocaleString('es-CO')} g` : 'Sin dato',
      icono: IcScale,
      tono: 'neutral',
    },
    {
      etiqueta: 'Mortalidad acumulada',
      valor: `${resumen.avesMuertas.toLocaleString('es-CO')} aves`,
      icono: IcHeart,
      tono: 'alerta',
    },
    {
      etiqueta: 'Alimento registrado',
      valor: `${resumen.alimentoKg.toLocaleString('es-CO')} kg`,
      icono: IcSeed,
      tono: 'ok',
    },
    {
      etiqueta: 'Agua registrada',
      valor: `${resumen.aguaLitros.toLocaleString('es-CO')} L`,
      icono: IcDrop,
      tono: 'info',
    },
  ] as const

  return (
    <section className="bit-resumen-lote" aria-label="Resumen del lote">
      {indicadores.map((indicador) => {
        const Icono = indicador.icono
        return (
          <article key={indicador.etiqueta} className={`bit-indicador bit-indicador--${indicador.tono}`}>
            <span aria-hidden="true"><Icono size={19} /></span>
            <div>
              <small>{indicador.etiqueta}</small>
              <strong>{indicador.valor}</strong>
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default ResumenLote
