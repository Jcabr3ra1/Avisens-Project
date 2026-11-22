import type { ReactNode } from 'react'
import type { DashboardAlerta, DashboardIndicador, DashboardLote } from '@features/dashboard/model/dashboard'
import { IcAlert, IcArrowRight, IcChart, IcDrop, IcEgg, IcSeed } from '@shared/ui/icons/icons'
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
  diaLote: number | null
  nombreGalpon: string | null
  galponId: number | null
  mortalidad: MortalidadLote[]
  consumos: ConsumoLote[]
  eventos: EventoSanitarioLote[]
  alertas: DashboardAlerta[]
  indicadores: DashboardIndicador[]
  cargandoRegistros: boolean
  cargandoIndicadores: boolean
  error: boolean
  onAbrirGuia?: (loteId: number) => void
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

function ResumenLoteOperario({
  lote,
  diaLote,
  nombreGalpon,
  galponId,
  mortalidad,
  consumos,
  eventos,
  alertas,
  indicadores,
  cargandoRegistros,
  cargandoIndicadores,
  error,
  onAbrirGuia,
}: Props) {
  const cargando = cargandoRegistros
  const cargandoSalud = cargandoRegistros || cargandoIndicadores
  const reciente = indicadores[0] ?? null
  const muertas = lote ? avesMuertasDelLote(lote.id, mortalidad) : 0
  const ultimo = lote ? ultimoConsumoDelLote(lote.id, consumos) : null
  const alimento = numeroOpcional(ultimo?.alimento_kg)
  const agua = numeroOpcional(ultimo?.agua_litros)
  const fechaConsumo = ultimo ? `Del ${formatearFechaCalendario(ultimo.fecha)}` : 'Sin consumos aún'
  const epef = calidadCrianza(reciente)
  const salud = lote && galponId !== null
    ? saludDelLote({ loteId: lote.id, galponId, alertas, eventos, reciente, hoy: fechaDeHoy() })
    : null
  const pendiente = cargando ? '…' : '—'

  const cifras: Cifra[] = lote ? [
    {
      id: 'vivas',
      icono: <IcEgg size={15} />,
      etiqueta: 'Aves vivas',
      valor: cargando ? pendiente : numero(avesVivas(lote.cantidadInicial, muertas)),
      nota: `de ${numero(lote.cantidadInicial)} al ingreso`,
    },
    {
      id: 'muertas',
      icono: <IcAlert size={15} />,
      etiqueta: 'Mortalidad',
      valor: cargando ? pendiente : numero(muertas),
      nota: lote.cantidadInicial > 0 ? `${numero((muertas / lote.cantidadInicial) * 100, 1)} % del lote` : undefined,
      tono: muertas > 0 && lote.cantidadInicial > 0 && muertas / lote.cantidadInicial >= 0.02 ? 'peligro' : undefined,
    },
    {
      id: 'alimento',
      icono: <IcSeed size={15} />,
      etiqueta: 'Último alimento',
      valor: cargando ? pendiente : alimento === null ? '—' : `${numero(alimento, 1)} kg`,
      nota: cargando ? undefined : fechaConsumo,
    },
    {
      id: 'agua',
      icono: <IcDrop size={15} />,
      etiqueta: 'Última agua',
      valor: cargando ? pendiente : agua === null ? '—' : `${numero(agua, 1)} L`,
      nota: cargando ? undefined : fechaConsumo,
      aviso: ultimo?.alerta_agua_baja ? 'Agua baja' : undefined,
      tono: ultimo?.alerta_agua_baja ? 'aviso' : undefined,
    },
    {
      id: 'epef',
      icono: <IcChart size={15} />,
      etiqueta: 'Calidad (EPEF)',
      valor: cargandoIndicadores ? '…' : epef.tipo === 'valor' ? numero(epef.valor) : epef.tipo === 'fuera_de_rango' ? 'Revisar' : '—',
      nota: cargandoIndicadores ? undefined : epef.tipo === 'valor'
        ? 'Más alto es mejor'
        : epef.tipo === 'fuera_de_rango'
          ? 'Revisa pesajes en bitácora'
          : 'Sin indicador aún',
      tono: !cargandoIndicadores && epef.tipo === 'fuera_de_rango' ? 'aviso' : undefined,
    },
  ] : []

  return (
    <section className="op-card" aria-labelledby="operario-lote-titulo" aria-busy={cargandoSalud}>
      <header className="op-card-cabecera">
        <div>
          <span className="op-rotulo">Seguimiento diario</span>
          <div className="op-card-titulo-fila">
            <h2 id="operario-lote-titulo">
              {lote ? `${nombreGalpon ?? 'Galpón'} · ${lote.codigo}` : (nombreGalpon ?? 'Tu lote hoy')}
            </h2>
            {lote && diaLote !== null && (
              <span className="op-dia-pill">Día {diaLote}</span>
            )}
          </div>
        </div>
        {lote && onAbrirGuia && (
          <button
            type="button"
            className="adm-btn adm-btn--secundario"
            onClick={() => onAbrirGuia(lote.id)}
          >
            Guía de peso <IcArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </header>

      {error && (
        <p className="op-aviso-inline" role="status">
          No se pudieron cargar todos los registros del lote. Algunas cifras pueden estar incompletas.
        </p>
      )}

      {!lote ? (
        <div className="op-vacio-inline">
          <IcEgg size={18} aria-hidden="true" />
          <span>Este galpón no tiene un lote activo en este momento.</span>
        </div>
      ) : (
        <>
          <ul className="op-cifras" aria-label={`Cifras del lote ${lote.codigo}`}>
            {cifras.map((cifra) => (
              <li key={cifra.id} className={`op-cifra${cifra.tono ? ` op-cifra--${cifra.tono}` : ''}`}>
                <div className="op-cifra-top">
                  <span className="op-cifra-etiqueta">{cifra.etiqueta}</span>
                  <span className="op-cifra-icono" aria-hidden="true">{cifra.icono}</span>
                </div>
                <strong className="op-cifra-valor">{cifra.valor}</strong>
                {cifra.nota && <span className="op-cifra-nota">{cifra.nota}</span>}
                {cifra.aviso && <span className="op-cifra-aviso">{cifra.aviso}</span>}
              </li>
            ))}

            {salud && (
              <li className={`op-cifra op-cifra--salud op-salud--${cargandoSalud ? 'sin_datos' : salud.estado}`}>
                <div className="op-cifra-top">
                  <span className="op-cifra-etiqueta">Salud del lote</span>
                  <span className="op-salud-estado">{cargandoSalud ? 'Calculando…' : salud.etiqueta}</span>
                </div>
                <div
                  className="op-salud-barra"
                  role="meter"
                  aria-label="Salud del lote"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={cargandoSalud ? 0 : salud.progreso}
                  aria-valuetext={cargandoSalud ? 'Calculando' : salud.etiqueta}
                >
                  <span style={{ width: `${cargandoSalud ? 0 : salud.progreso}%` }} />
                </div>
                <span className="op-cifra-nota">
                  {salud.alertasActivas === 1 ? '1 alerta' : `${salud.alertasActivas} alertas`}
                  {' · '}
                  {salud.avesEnSeguimiento === 1
                    ? '1 ave en seguimiento'
                    : `${numero(salud.avesEnSeguimiento)} en seguimiento`}
                </span>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  )
}

export default ResumenLoteOperario
