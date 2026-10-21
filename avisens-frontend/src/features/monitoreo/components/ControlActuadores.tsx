// ControlActuadores.tsx — Encender, apagar o devolver a automático los relés
// K1-K4 del galpón. Modo y salida son los que informó el ESP32 en su último
// envío; un botón pulsado solo deja la orden "en curso" hasta su respuesta.
import {
  IcDrop,
  IcFan,
  IcFlame,
  IcPlay,
  IcRefresh,
  IcSettings,
  IcStop,
  IcWind,
} from '@shared/ui/icons/icons'
import type { SensorVista } from '../hooks/useMonitoreoAmbiental'
import { useControlActuadores } from '../hooks/useControlActuadores'
import type { AccionOrden } from '../api/ordenesActuadores'
import {
  ETIQUETA_MODO,
  TEXTO_SIN_CONFIRMACION_FISICA,
  estadoActualRele,
  opcionActiva,
  opcionSolicitada,
  ordenEnCurso,
  puedeEnviarOrden,
  textoOrden,
  textoSalida,
  tonoOrden,
} from '../model/actuadores'
import { etiquetaRele } from '@features/sensores/model/reles'
import './ControlActuadores.css'

type Props = {
  galponId: number
  reles: SensorVista[]
  // Se llama cuando una orden termina, para refrescar las tarjetas.
  onOrdenFinalizada: () => void
  // Abre la ficha administrativa del relé (Monitoreo → Actuadores).
  onAbrirFicha?: (rele: SensorVista) => void
}

const ACCIONES: { accion: AccionOrden; texto: string; Icono: typeof IcPlay }[] = [
  { accion: 'encender', texto: 'Encender', Icono: IcPlay },
  { accion: 'apagar', texto: 'Apagar', Icono: IcStop },
  { accion: 'automatico', texto: 'Automático', Icono: IcRefresh },
]

// "K2 · rele:k2" si está registrado por canal; si es un registro antiguo,
// su código (el firmware nuevo no lo puede controlar hasta registrarlo).
function textoIdentidad(rele: SensorVista): string {
  const k = etiquetaRele(rele)
  if (rele.canal) return `${k ?? rele.canal} · canal ${rele.canal}`
  return `${k ? `${k} · ` : ''}${rele.codigo} · sin canal`
}

// Ícono por relé según su canal (K1..K4) o, si es un registro antiguo, su
// código: el texto libre de `tipo` no basta para distinguirlos. K1
// calefacción, K2 ventiladores, K3 extractores, K4 bomba de agua (ver
// GestorActuadores.h en el firmware).
const ICONO_RELE: Record<string, typeof IcPlay> = { K1: IcFlame, K2: IcFan, K3: IcWind, K4: IcDrop }

function IconoRele({ rele }: { rele: SensorVista }) {
  const k = etiquetaRele(rele)
  const Icono = (k && ICONO_RELE[k]) || IcSettings
  return <Icono size={20} />
}

export function ControlActuadores({ galponId, reles, onOrdenFinalizada, onAbrirFicha }: Props) {
  const { ordenes, reles: estados, enviando, errores, errorCarga, enviar } =
    useControlActuadores(galponId, onOrdenFinalizada)

  return (
    <section className="mon-section" aria-labelledby="ctl-titulo">
      <h2 id="ctl-titulo" className="mon-section-title">Control de actuadores</h2>
      <p className="mon-section-sub">
        Las órdenes las aplica el ESP32 en su próximo ciclo (unos segundos) y puede rechazarlas si
        violan una protección: calor, gases altos, tanque lleno, agua baja o un sensor en error.
      </p>
      {/* Vale para todos los relés: se dice una vez, no en cada tarjeta. */}
      <p className="ctl-mensaje ctl-mensaje--tenue ctl-nota">{TEXTO_SIN_CONFIRMACION_FISICA}</p>
      {errorCarga && <div className="adm-aviso ctl-aviso" role="status">{errorCarga}</div>}

      <div className="ctl-grid">
        {reles.map((rele) => {
          const orden = ordenes[rele.id]
          const actual = estadoActualRele(rele, estados[rele.id])
          const enCurso = ordenEnCurso(orden) || enviando[rele.id] === true
          // Activa = lo que informó el ESP32; solicitada = lo pedido que aún
          // espera respuesta. Se pintan distinto: pedido no es aplicado.
          const activa = opcionActiva(actual)
          const solicitada = opcionSolicitada(orden)

          return (
            <article key={rele.id} className="ctl-card adm-panel" aria-busy={enCurso}>
              <header className="ctl-cabecera">
                <span className="ctl-icono"><IconoRele rele={rele} /></span>
                <div className="ctl-nombre">
                  <strong>{rele.tipo}</strong>
                  <small>{textoIdentidad(rele)}</small>
                </div>
                <span className={`mon-estado-badge ctl-modo ctl-modo--${actual.modo}`}>
                  {ETIQUETA_MODO[actual.modo]}
                </span>
              </header>

              <p className="ctl-estado">
                {actual.encendido === null
                  ? <span className="ctl-sin-dato">{textoSalida(null)}</span>
                  : <strong className={`mon-onoff mon-onoff--${actual.encendido ? 'on' : 'off'}`}>{textoSalida(actual.encendido)}</strong>}
              </p>

              <div className="ctl-acciones" role="group" aria-label={`Acciones para ${rele.tipo}`}>
                {ACCIONES.map(({ accion, texto, Icono }) => {
                  const esActiva = activa === accion
                  const esSolicitada = solicitada === accion && !esActiva
                  return (
                    <button
                      key={accion}
                      type="button"
                      className={`adm-btn ctl-opcion ctl-opcion--${accion}${esSolicitada ? ' ctl-opcion--solicitada' : ''}`}
                      aria-pressed={esActiva}
                      disabled={!puedeEnviarOrden(actual, enCurso)}
                      onClick={() => { void enviar(rele.id, accion) }}
                    >
                      <Icono size={16} />
                      <span>{texto}</span>
                      {esSolicitada && <span className="sr-only"> (pedido, esperando al ESP32)</span>}
                    </button>
                  )
                })}
              </div>

              <div className="ctl-mensajes" aria-live="polite">
                {enviando[rele.id] && <p className="ctl-mensaje">Enviando orden…</p>}
                {orden && !enviando[rele.id] && (
                  <p className={`ctl-mensaje mon-estado-badge mon-estado-badge--${tonoOrden(orden.estado)}`}>
                    {textoOrden(orden)}
                  </p>
                )}
                {!actual.conectado && (
                  <p className="ctl-mensaje ctl-mensaje--tenue">
                    El ESP32 no está reportando: no se pueden enviar órdenes y el modo actual no se conoce.
                  </p>
                )}
                {actual.modo === 'manual_local' && (
                  <p className="ctl-mensaje ctl-mensaje--tenue">
                    Alguien tomó este relé desde el monitor serie del ESP32: la web no puede cambiarlo.
                  </p>
                )}
                {errores[rele.id] && <p className="ctl-mensaje ctl-mensaje--error" role="alert">{errores[rele.id]}</p>}
              </div>

              {onAbrirFicha && (
                <button type="button" className="ctl-ficha" onClick={() => onAbrirFicha(rele)}>
                  Ver ficha del actuador
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
