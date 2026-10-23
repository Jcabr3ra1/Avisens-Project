// ControlActuadores.tsx — Encender, apagar o devolver a automático los relés
// K1-K4 del galpón. Modo y salida son los que informó el ESP32 en su último
// envío; un botón pulsado solo deja la orden "en curso" hasta su respuesta.
import { iconoSensor } from '@shared/ui/sensorIcon'
import type { SensorVista } from '../hooks/useMonitoreoAmbiental'
import { useControlActuadores } from '../hooks/useControlActuadores'
import type { AccionOrden } from '../api/ordenesActuadores'
import {
  ETIQUETA_MODO,
  TEXTO_SIN_CONFIRMACION_FISICA,
  estadoActualRele,
  ordenEnCurso,
  textoOrden,
  textoSalida,
  tonoOrden,
} from '../model/actuadores'
import './ControlActuadores.css'

type Props = {
  galponId: number
  reles: SensorVista[]
  // Se llama cuando una orden termina, para refrescar las tarjetas.
  onOrdenFinalizada: () => void
}

const ACCIONES: { accion: AccionOrden; texto: string; clase: string }[] = [
  { accion: 'encender', texto: 'Encender', clase: 'adm-btn--primario' },
  { accion: 'apagar', texto: 'Apagar', clase: 'adm-btn--secundario' },
  { accion: 'automatico', texto: 'Automático', clase: 'adm-btn--secundario' },
]

// Insignia del modo con las variantes que ya existen en Monitoreo.
const TONO_MODO = {
  automatico: 'sin_umbral',
  manual_remoto: 'advertencia',
  manual_local: 'advertencia',
  desconocido: 'offline',
} as const

export function ControlActuadores({ galponId, reles, onOrdenFinalizada }: Props) {
  const { ordenes, reles: estados, enviando, errores, errorCarga, enviar } =
    useControlActuadores(galponId, onOrdenFinalizada)

  return (
    <section className="mon-section" aria-labelledby="ctl-titulo">
      <h2 id="ctl-titulo" className="mon-section-title">Control de actuadores</h2>
      <p className="mon-section-sub">
        Las órdenes las aplica el ESP32 en su próximo ciclo (unos segundos) y puede rechazarlas si
        violan una protección: calor, gases altos, tanque lleno, agua baja o un sensor en error.
      </p>
      {errorCarga && <div className="adm-aviso ctl-aviso" role="status">{errorCarga}</div>}

      <div className="ctl-grid">
        {reles.map((rele) => {
          const orden = ordenes[rele.id]
          const actual = estadoActualRele(rele, estados[rele.id])
          const enCurso = ordenEnCurso(orden) || enviando[rele.id] === true

          return (
            <article key={rele.id} className="ctl-card adm-panel" aria-busy={enCurso}>
              <header className="ctl-cabecera">
                <span className="ctl-icono">{iconoSensor(rele.tipo, 20)}</span>
                <div className="ctl-nombre">
                  <strong>{rele.tipo}</strong>
                  <small>{rele.codigo}</small>
                </div>
                <span className={`mon-estado-badge mon-estado-badge--${TONO_MODO[actual.modo]}`}>
                  {ETIQUETA_MODO[actual.modo]}
                </span>
              </header>

              <p className="ctl-estado">
                {actual.encendido === null
                  ? <span className="mon-offline-txt">{textoSalida(null)}</span>
                  : <strong className={`mon-onoff mon-onoff--${actual.encendido ? 'on' : 'off'}`}>{textoSalida(actual.encendido)}</strong>}
              </p>
              <p className="ctl-mensaje ctl-mensaje--tenue">{TEXTO_SIN_CONFIRMACION_FISICA}</p>

              <div className="ctl-acciones" role="group" aria-label={`Acciones para ${rele.tipo}`}>
                {ACCIONES.map(({ accion, texto, clase }) => (
                  <button
                    key={accion}
                    type="button"
                    className={`adm-btn ${clase}`}
                    disabled={enCurso || !actual.conectado}
                    onClick={() => { void enviar(rele.id, accion) }}
                  >
                    {texto}
                  </button>
                ))}
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
            </article>
          )
        })}
      </div>
    </section>
  )
}
