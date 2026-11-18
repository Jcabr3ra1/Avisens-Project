import type { ReactNode } from 'react'
import type { DashboardAlerta, DashboardIndicador, DashboardLote } from '@features/dashboard/model/dashboard'
import type { FilaGalpon } from '@features/dashboard/model/resumenGranja'
import { IcChart, IcDrop, IcEgg, IcHeart, IcSeed } from '@shared/ui/icons/icons'
import { fechaDeHoy, formatearFechaCalendario } from '@shared/utils/fechas'
import {
  avesMuertasDelLote,
  avesVivas,
  calidadCrianza,
  numeroOpcional,
  saludDelLote,
  ultimoConsumoDelLote,
  type ConsumoLote,
  type EventoSanitarioLote,
  type MortalidadLote,
} from '../model/resumenLoteOperario'

type Props = {
  lote: DashboardLote | null
  nombreGalpon: string | null
  galponId: number | null
  galpones: FilaGalpon[]
  onSeleccionarGalpon: (id: number) => void
  mortalidad: MortalidadLote[]
  consumos: ConsumoLote[]
  eventos: EventoSanitarioLote[]
  alertas: DashboardAlerta[]
  indicadores: DashboardIndicador[]
  // Mortalidad y consumos (aves y último consumo) llegan por un lado; los
  // indicadores del lote (EPEF y salud) por otro, y se recargan al cambiar de
  // galpón. Cada cifra espera solo lo que necesita.
  cargandoRegistros: boolean
  cargandoIndicadores: boolean
  error: boolean
}

type Cifra = {
  id: string
  icono: ReactNode
  etiqueta: string
  valor: string
  nota?: string
  aviso?: string
  tono?: 'peligro' | 'aviso'
}

const numero = (valor: number, decimales = 0) =>
  valor.toLocaleString('es-CO', { maximumFractionDigits: decimales })

// Las cifras del lote que el operario consulta cada día: las mismas que la app
// Android le muestra en su inicio (aves vivas y muertas, último consumo,
// calidad de crianza y salud del lote).
function ResumenLoteOperario({
  lote, nombreGalpon, galponId, galpones, onSeleccionarGalpon,
  mortalidad, consumos, eventos, alertas, indicadores, cargandoRegistros, cargandoIndicadores, error,
}: Props) {
  const cargando = cargandoRegistros
  const cargandoSalud = cargandoRegistros || cargandoIndicadores
  const reciente = indicadores[0] ?? null
  const muertas = lote ? avesMuertasDelLote(lote.id, mortalidad) : 0
  const ultimo = lote ? ultimoConsumoDelLote(lote.id, consumos) : null
  const alimento = numeroOpcional(ultimo?.alimento_kg)
  const agua = numeroOpcional(ultimo?.agua_litros)
  const fechaConsumo = ultimo ? `Registro del ${formatearFechaCalendario(ultimo.fecha)}` : 'Sin consumos registrados'
  const epef = calidadCrianza(reciente)
  const salud = lote && galponId !== null
    ? saludDelLote({ loteId: lote.id, galponId, alertas, eventos, reciente, hoy: fechaDeHoy() })
    : null
  const pendiente = cargando ? '…' : '—'

  const cifras: Cifra[] = lote ? [
    {
      id: 'vivas',
      icono: <IcEgg size={18} />,
      etiqueta: 'Aves vivas',
      valor: cargando ? pendiente : numero(avesVivas(lote.cantidadInicial, muertas)),
      nota: `De ${numero(lote.cantidadInicial)} al ingreso`,
    },
    {
      id: 'muertas',
      icono: <IcHeart size={18} />,
      etiqueta: 'Aves muertas',
      valor: cargando ? pendiente : numero(muertas),
      nota: lote.cantidadInicial > 0 ? `${numero((muertas / lote.cantidadInicial) * 100, 1)} % del lote` : undefined,
      tono: muertas > 0 && lote.cantidadInicial > 0 && muertas / lote.cantidadInicial >= 0.02 ? 'peligro' : undefined,
    },
    {
      id: 'alimento',
      icono: <IcSeed size={18} />,
      etiqueta: 'Último alimento',
      valor: cargando ? pendiente : alimento === null ? '—' : `${numero(alimento, 1)} kg`,
      nota: cargando ? undefined : fechaConsumo,
    },
    {
      id: 'agua',
      icono: <IcDrop size={18} />,
      etiqueta: 'Última agua',
      valor: cargando ? pendiente : agua === null ? '—' : `${numero(agua, 1)} L`,
      nota: cargando ? undefined : fechaConsumo,
      aviso: ultimo?.alerta_agua_baja ? 'Agua baja' : undefined,
      tono: ultimo?.alerta_agua_baja ? 'aviso' : undefined,
    },
    {
      id: 'epef',
      icono: <IcChart size={18} />,
      etiqueta: 'Calidad de crianza (EPEF)',
      valor: cargandoIndicadores ? '…' : epef.tipo === 'valor' ? numero(epef.valor) : epef.tipo === 'fuera_de_rango' ? 'Dato fuera de rango' : '—',
      nota: cargandoIndicadores ? undefined : epef.tipo === 'valor'
        ? 'Más alto es mejor'
        : epef.tipo === 'fuera_de_rango'
          ? 'Revisa pesajes y consumos en la bitácora'
          : 'Aún sin indicador verificado',
      tono: !cargandoIndicadores && epef.tipo === 'fuera_de_rango' ? 'aviso' : undefined,
    },
  ] : []

  return (
    <section className="operario-lote-resumen" aria-labelledby="operario-lote-titulo" aria-busy={cargandoSalud}>
      <header className="rsm-cabecera">
        <div>
          <h2 id="operario-lote-titulo" className="rsm-titulo rsm-titulo--grande">Tu lote hoy</h2>
          <p className="rsm-subtitulo">
            {lote ? `${nombreGalpon ?? 'Galpón'} · ${lote.codigo}` : 'Elige un galpón para ver su lote'}
          </p>
        </div>
      </header>

      {galpones.length > 1 && (
        <div className="rsm-galpon-pestanas" role="group" aria-label="Galpón del resumen">
          {galpones.map((galpon) => (
            <button
              key={galpon.id}
              type="button"
              className="rsm-galpon-pestana"
              aria-pressed={galpon.id === galponId}
              onClick={() => onSeleccionarGalpon(galpon.id)}
            >
              {galpon.nombre}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="operario-lote-error" role="status">
          No se pudieron cargar todos los registros del lote. Algunas cifras pueden estar incompletas.
        </p>
      )}

      {!lote ? (
        <p className="operario-sin-lote">Este galpón no tiene un lote activo.</p>
      ) : (
        <>
          <ul className="operario-cifras" aria-label={`Cifras del lote ${lote.codigo}`}>
            {cifras.map((cifra) => (
              <li key={cifra.id} className={`operario-cifra${cifra.tono ? ` operario-cifra--${cifra.tono}` : ''}`}>
                <span className="operario-cifra-icono" aria-hidden="true">{cifra.icono}</span>
                <span className="operario-cifra-etiqueta">{cifra.etiqueta}</span>
                <strong className="operario-cifra-valor">{cifra.valor}</strong>
                {cifra.nota && <span className="operario-cifra-nota">{cifra.nota}</span>}
                {cifra.aviso && <span className="operario-cifra-aviso">{cifra.aviso}</span>}
              </li>
            ))}
          </ul>

          {salud && (
            <div className={`operario-salud operario-salud--${cargandoSalud ? 'sin_datos' : salud.estado}`}>
              <div className="operario-salud-cabecera">
                <span className="operario-salud-titulo">Salud del lote</span>
                <span className="operario-salud-estado">{cargandoSalud ? 'Calculando…' : salud.etiqueta}</span>
              </div>
              <div
                className="operario-salud-barra"
                role="meter"
                aria-label="Salud del lote"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={cargandoSalud ? 0 : salud.progreso}
                aria-valuetext={cargandoSalud ? 'Calculando' : salud.etiqueta}
              >
                <span style={{ width: `${cargandoSalud ? 0 : salud.progreso}%` }} />
              </div>
              <p className="operario-salud-detalle">
                {salud.alertasActivas === 1 ? '1 alerta activa' : `${salud.alertasActivas} alertas activas`}
                {' · '}
                {salud.avesEnSeguimiento === 1
                  ? '1 ave en seguimiento sanitario (7 días)'
                  : `${numero(salud.avesEnSeguimiento)} aves en seguimiento sanitario (7 días)`}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default ResumenLoteOperario
