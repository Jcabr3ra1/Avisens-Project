import { lazy, Suspense, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { IcClose } from '@shared/ui/icons/icons'
import { useSerieSensor } from '../../hooks/useSerieSensor'
import { antiguedadDeLectura, lecturaDeSensor, rangoConfigurado, senalDeSensor, type SensorEscena } from '../../model/escenaGalpon'

const GraficoSerie = lazy(() => import('@shared/ui/graficos/GraficoSerie'))

export type LadoDialogo = 'izquierda' | 'derecha' | 'abajo'

type Props = {
  sensor: SensorEscena
  imagen: string
  ancla: DOMRect
  lado: LadoDialogo
  onCerrar: () => void
}

const ANCHO = 336
const SEPARACION = 14
const MARGEN = 8
const ALTO_INICIAL = 420

function posicionar(ancla: DOMRect, lado: LadoDialogo, alto: number): { left: number; top: number } {
  const left = lado === 'derecha'
    ? ancla.right + SEPARACION
    : lado === 'izquierda'
      ? ancla.left - ANCHO - SEPARACION
      : ancla.left + ancla.width / 2 - ANCHO / 2
  const top = lado === 'abajo' ? ancla.bottom + SEPARACION : ancla.top + ancla.height / 2 - alto / 2
  return {
    left: Math.min(Math.max(left, MARGEN), window.innerWidth - ANCHO - MARGEN),
    top: Math.min(Math.max(top, MARGEN), Math.max(MARGEN, window.innerHeight - alto - MARGEN)),
  }
}

function elementosEnfocables(raiz: HTMLElement): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')]
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function DialogoSensor({ sensor, imagen, ancla, lado, onCerrar }: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const titulo = useId()
  const descripcion = useId()
  const [posicion, setPosicion] = useState<{ left: number; top: number }>(() => posicionar(ancla, lado, ALTO_INICIAL))
  const { serie, resumen, cargando } = useSerieSensor(sensor.id)
  const senal = senalDeSensor(sensor.estado)
  const rango = rangoConfigurado(sensor)
  const unidad = sensor.unidad
  const cifra = (valor: number | null) => (valor === null ? '—' : decimal.format(valor))

  useLayoutEffect(() => {
    const elemento = raiz.current
    if (!elemento) return
    const ajustar = () => setPosicion(posicionar(ancla, lado, elemento.offsetHeight))
    ajustar()
    const observador = new ResizeObserver(ajustar)
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ancla, lado])

  useEffect(() => {
    raiz.current?.focus({ preventScroll: true })
    const cerrar = () => onCerrar()
    const fuera = (evento: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node) && !(evento.target as Element).closest('.gsr-sensor')) onCerrar()
    }
    window.addEventListener('resize', cerrar)
    window.addEventListener('scroll', cerrar, true)
    document.addEventListener('pointerdown', fuera)
    return () => {
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('scroll', cerrar, true)
      document.removeEventListener('pointerdown', fuera)
    }
  }, [onCerrar])

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      onCerrar()
      return
    }
    if (evento.key !== 'Tab' || !raiz.current) return
    const lista = elementosEnfocables(raiz.current)
    if (lista.length === 0) return
    const primero = lista[0]
    const ultimo = lista[lista.length - 1]
    if (evento.shiftKey && (document.activeElement === primero || document.activeElement === raiz.current)) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primero.focus()
    }
  }

  return createPortal(
    <>
      <div className="escena-dialogo-velo" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={raiz}
        className="escena-dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo}
        aria-describedby={descripcion}
        tabIndex={-1}
        data-estado={sensor.estado}
        style={{ '--izquierda': `${posicion.left}px`, '--arriba': `${posicion.top}px`, '--ancho': `${ANCHO}px` } as CSSProperties}
        onKeyDown={alPresionarTecla}
      >
        <header className="escena-dialogo-cabecera">
          <img src={imagen} alt="" />
          <div>
            <h2 id={titulo}>{sensor.nombre}</h2>
            <span className="escena-dialogo-estado">{sensor.etiquetaEstado}</span>
          </div>
          <button type="button" className="escena-dialogo-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <IcClose size={16} aria-hidden="true" />
          </button>
        </header>

        <p className="escena-dialogo-lectura">{lecturaDeSensor(sensor)}</p>

        <section className="escena-dialogo-bloque" aria-label="Señal del sensor">
          <h3>Señal</h3>
          <dl className="escena-dialogo-datos">
            <div>
              <dt>Conexión</dt>
              <dd className={senal.viva ? 'escena-dialogo-viva' : 'escena-dialogo-caida'}>
                <span aria-hidden="true" />
                {senal.texto}
              </dd>
            </div>
            <div><dt>Última lectura</dt><dd>{antiguedadDeLectura(sensor.ultimaLecturaTs)}</dd></div>
            <div><dt>Sensor</dt><dd className="escena-dialogo-codigo">{sensor.codigo}</dd></div>
          </dl>
        </section>

        <section className="escena-dialogo-bloque" aria-label="Datos que envía">
          <h3>Datos que envía · últimas 24 h</h3>
          <dl className="escena-dialogo-extremos">
            <div><dt>Mín</dt><dd>{cifra(resumen.minimo)}</dd></div>
            <div><dt>Prom</dt><dd>{cifra(resumen.promedio)}</dd></div>
            <div><dt>Máx</dt><dd>{cifra(resumen.maximo)}</dd></div>
            <div className="escena-dialogo-unidad"><dt>Unidad</dt><dd>{unidad || '—'}</dd></div>
          </dl>
          {rango && <p className="escena-dialogo-rango">Rango configurado: {rango}</p>}
          {cargando ? (
            <p className="escena-dialogo-vacio" role="status">Cargando lecturas…</p>
          ) : serie.length === 0 ? (
            <p className="escena-dialogo-vacio">No hay lecturas en las últimas 24 horas.</p>
          ) : (
            <Suspense fallback={<p className="escena-dialogo-vacio" role="status">Cargando gráfico…</p>}>
              <GraficoSerie
                puntos={serie.map((punto) => ({ etiqueta: punto.hora, valor: punto.valor }))}
                unidad={unidad}
                minimo={sensor.minUmbral}
                maximo={sensor.maxUmbral}
                altura={120}
                descripcion={`Lecturas de ${sensor.nombre} en las últimas 24 horas, entre ${cifra(resumen.minimo)} y ${cifra(resumen.maximo)} ${unidad}`}
              />
            </Suspense>
          )}
        </section>

        <p id={descripcion} className="escena-dialogo-explicacion">{sensor.explicacion}</p>
      </div>
    </>,
    document.body,
  )
}

export default DialogoSensor
