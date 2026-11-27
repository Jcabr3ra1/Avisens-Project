import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import { IcAlert, IcArrowRight, IcDrop, IcScale, IcSeed } from '@shared/ui/icons/icons'
import type { TipoRegistro } from '../model/bitacora'
import type { ResumenBitacora } from '../model/resumenBitacora'

type Props = {
  codigoLote: string
  resumen: ResumenBitacora
  conteos: {
    pesajes: number
    mortalidad: number
    sanitarios: number
    consumos: number
  }
  onRegistrar: (tipo: TipoRegistro) => void
  onRegistrarConsumo: () => void
}

function AccionesRapidasBitacora({
  codigoLote,
  resumen,
  conteos,
  onRegistrar,
  onRegistrarConsumo,
}: Props) {
  const acciones = [
    {
      id: 'peso',
      titulo: 'Registrar peso',
      descripcion: 'Controlar el crecimiento promedio del lote.',
      estado: resumen.ultimoPeso
        ? `Último: ${formatearPeso(resumen.ultimoPeso.peso_promedio_g)}`
        : 'Sin pesajes aún',
      icono: IcScale,
      tono: 'primario',
      onClick: () => onRegistrar('peso'),
    },
    {
      id: 'mortalidad',
      titulo: 'Registrar mortalidad',
      descripcion: 'Reportar aves fallecidas y causa presuntiva.',
      estado: resumen.avesMuertas > 0
        ? `${resumen.avesMuertas.toLocaleString('es-CO')} aves acumuladas`
        : 'Sin bajas registradas',
      icono: IcAlert,
      tono: 'peligro',
      onClick: () => onRegistrar('mortalidad'),
    },
    {
      id: 'sanitario',
      titulo: 'Registrar sanidad',
      descripcion: 'Vacunas, tratamientos o revisiones veterinarias.',
      estado: conteos.sanitarios > 0
        ? `${conteos.sanitarios} ${conteos.sanitarios === 1 ? 'evento' : 'eventos'} registrados`
        : 'Sin eventos sanitarios',
      icono: IcDrop,
      tono: 'info',
      onClick: () => onRegistrar('sanitario'),
    },
    {
      id: 'consumo',
      titulo: 'Registrar consumo',
      descripcion: 'Anotar alimento y agua suministrados en el día.',
      estado: conteos.consumos > 0
        ? `${resumen.alimentoKg.toLocaleString('es-CO')} kg · ${resumen.aguaLitros.toLocaleString('es-CO')} L`
        : 'Sin consumos aún',
      icono: IcSeed,
      tono: 'ok',
      onClick: onRegistrarConsumo,
    },
  ] as const

  return (
    <section className="bit-card bit-acciones-rapidas" aria-labelledby="bit-acciones-titulo">
      <header className="bit-seccion-cab">
        <div className="bit-seccion-titulos">
          <p className="bit-kicker">Registro diario</p>
          <h2 id="bit-acciones-titulo">¿Qué deseas registrar?</h2>
          <p className="bit-seccion-sub">
            Accesos directos para anotar novedades en el lote <strong>{codigoLote}</strong>.
          </p>
        </div>
      </header>

      <div className="bit-acciones-grid">
        {acciones.map((accion) => {
          const Icono = accion.icono
          return (
            <button
              key={accion.id}
              type="button"
              className={`bit-accion-card bit-accion-card--${accion.tono}`}
              onClick={accion.onClick}
            >
              <span className="bit-accion-icono" aria-hidden="true">
                <Icono size={20} />
              </span>
              <span className="bit-accion-texto">
                <strong>{accion.titulo}</strong>
                <small>{accion.descripcion}</small>
                <span className="bit-accion-dato">{accion.estado}</span>
              </span>
              <span className="bit-accion-flecha" aria-hidden="true">
                <IcArrowRight size={16} />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default AccionesRapidasBitacora
