import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import NumeroAnimado from '@features/organizaciones/components/NumeroAnimado'
import type { Lote } from '@features/lotes/api/lotes'
import { IcArrowRight, IcCheck, IcChevronRight, IcLeaf, IcRefresh } from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import { getRol } from '@shared/api'
import { permisosOperativosDeGalpon, puedeCompletarDatos } from '@shared/auth/permisos'
import type { Granja } from '../api/granjas'
import EsqueletoGranjas from '../components/EsqueletoGranjas'
import { ModalDatosGranja, ModalDatosLote } from '../components/ModalesDatos'
import { useEstructuraGranjas } from '../hooks/useEstructuraGranjas'
import { useIndicadoresDeLotes } from '../hooks/useIndicadoresDeLotes'
import { pesajesDelLote, progresoDatos, proximoPaso, type DestinoPaso, type PendienteDatos } from './explorador'
import { useCurvaLote } from './useCurvaLote'
import lunaLowPoly from '@features/dashboard/assets/escena/luna-low-poly.webp'
import solLowPoly from '@features/dashboard/assets/escena/sol-low-poly.webp'
import { useHoraDelDia } from '@features/dashboard/hooks/useFaseDelDia'
import { faseDelDia, posicionDelAstro } from '@features/dashboard/model/escenaGalpon'
import { FONDOS_POR_FASE } from './fondosPorFase'
import ListaGalpones from './ListaGalpones'
import ResumenPestana from './pestanas/ResumenPestana'
import LotePestana from './pestanas/LotePestana'
import AmbientePestana from './pestanas/AmbientePestana'
import UmbralesPestana from './pestanas/UmbralesPestana'
import DatosPestana from './pestanas/DatosPestana'
import BitacoraPestana from './pestanas/BitacoraPestana'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import '@features/organizaciones/components/HeroOrganizacion.css'
import './GranjasPropietario.css'

const EscenaGranja = lazy(() => import('./EscenaGranja'))
const cargarAlertas = () => import('@features/alertas/AlertasPage')
const AlertasPage = lazy(cargarAlertas)

const PESTANAS = ['resumen', 'lote', 'bitacora', 'ambiente', 'umbrales', 'alertas', 'datos'] as const
type Pestana = (typeof PESTANAS)[number]

function pestanaDe(valor: string | null): Pestana {
  return PESTANAS.find((pestana) => pestana === valor) ?? 'resumen'
}

function CargandoPestana() {
  return <div className="gp-curva-vacia" role="status">Cargando…</div>
}
type DatosAbiertos =
  | { tipo: 'granja'; granja: Granja }
  | { tipo: 'lote'; lote: Lote }
  | null

function enteroPositivo(valor: string | null): number | null {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null
}

function GranjasPropietario() {
  const navigate = useNavigate()
  const hora = useHoraDelDia()
  const fase = faseDelDia(hora)
  const astro = posicionDelAstro(hora)
  const [parametros] = useSearchParams()
  const { estructura, proveedores, lineasGeneticas, consumoPorLote, cargando, error, recargar } = useEstructuraGranjas()
  const [granjaId, setGranjaId] = useState<number | null>(() => enteroPositivo(parametros.get('granjaId')))
  const [galponId, setGalponId] = useState<number | null>(() => enteroPositivo(parametros.get('galpon')))
  const [pestana, setPestana] = useState<Pestana>(() => pestanaDe(parametros.get('pestana')))
  const [vistaBitacora, setVistaBitacora] = useState<'resumen' | 'peso'>('resumen')
  const [enDetalle, setEnDetalle] = useState(() => parametros.get('galpon') !== null)
  const [revision, setRevision] = useState(0)
  const [datos, setDatos] = useState<DatosAbiertos>(null)
  const llegoConDestino = useRef(parametros.get('pestana') !== null || parametros.get('galpon') !== null)

  const seleccionada = estructura.find((item) => item.granja.id === granjaId) ?? estructura[0] ?? null
  const galpones = useMemo(
    () => [...(seleccionada?.galpones ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo)),
    [seleccionada],
  )
  const galpon = galpones.find((item) => item.id === galponId)
  const curvaLote = useCurvaLote(galpon?.loteEnCurso?.id ?? null, revision)
    ?? galpones.find((item) => item.loteEnCurso !== null)
    ?? galpones[0]
    ?? null
  const loteIds = useMemo(
    () => galpones.flatMap((item) => (item.loteEnCurso ? [item.loteEnCurso.id] : [])),
    [galpones],
  )
  const { porLote } = useIndicadoresDeLotes(loteIds)
  const indicador = galpon?.loteEnCurso ? porLote.get(galpon.loteEnCurso.id)?.ultimo ?? null : null
  const progreso = seleccionada ? progresoDatos(seleccionada) : null

  useEffect(() => {
    void cargarAlertas()
  }, [])

  useEffect(() => {
    if (!llegoConDestino.current || !seleccionada) return
    llegoConDestino.current = false
    window.requestAnimationFrame(() => document.getElementById('gp-galpones')?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }, [seleccionada])

  async function recargarTodo() {
    await recargar()
    setRevision((valor) => valor + 1)
  }

  function abrirPendiente(pendiente: PendienteDatos) {
    if (!seleccionada) return
    if (pendiente.tipo === 'granja') setDatos({ tipo: 'granja', granja: seleccionada.granja })
    else setDatos({ tipo: 'lote', lote: pendiente.lote })
  }

  function irA(ruta: string) {
    if (ruta.startsWith('/bitacora')) {
      setVistaBitacora(ruta.includes('vista=peso') ? 'peso' : 'resumen')
      setPestana('bitacora')
    } else if (ruta.startsWith('/alertas')) setPestana('alertas')
    else if (ruta.startsWith('/monitoreo')) setPestana('ambiente')
    else navigate(ruta)
  }

  function irADestino(destino: DestinoPaso) {
    if (destino.tipo === 'datos-lote') setDatos({ tipo: 'lote', lote: destino.lote })
    else if (destino.tipo === 'ruta') irA(destino.ruta)
  }

  function elegirGalpon(id: number) {
    setGalponId(id)
    setEnDetalle(true)
  }

  if (cargando && estructura.length === 0) {
    return <div className="page-container gp-page"><EsqueletoGranjas /></div>
  }

  if (!seleccionada) {
    return (
      <div className="page-container gp-page">
        {error && <div className="adm-alerta" role="alert"><span>{error}</span><button type="button" onClick={() => void recargarTodo()}>Reintentar</button></div>}
        <div className="gp-vacio">
          <IcLeaf size={28} aria-hidden="true" />
          <h1>Aún no tienes granjas asignadas</h1>
          <p>Cuando el administrador registre tu granja, aquí verás sus galpones, lotes y sensores.</p>
        </div>
      </div>
    )
  }

  const { granja } = seleccionada
  const sensores = seleccionada.galpones.reduce((total, item) => total + item.sensores.length, 0)
  const indicadores = [
    { label: 'Galpones', valor: seleccionada.galpones.length, tono: 'profundo' },
    { label: 'Lotes en curso', valor: seleccionada.lotesActivos, tono: 'verde' },
    { label: 'Aves alojadas', valor: seleccionada.avesAlojadas, tono: 'verde' },
    { label: 'Sensores', valor: sensores, tono: 'amarillo' },
    { label: 'Alertas abiertas', valor: seleccionada.alertasAbiertas, tono: 'naranja' },
    { label: 'Datos completos', valor: progreso?.completos ?? 0, tono: 'profundo', total: progreso?.total },
  ]
  const ubicacion = [granja.municipio, granja.departamento].filter(Boolean).join(', ')
  const paso = galpon ? proximoPaso(galpon, indicador, pesajesDelLote(curvaLote)) : null

  return (
    <div className="page-container gp-page">
      {estructura.length > 1 && (
        <div className="gp-granjas" role="tablist" aria-label="Tus granjas">
          {estructura.map((item) => (
            <button
              key={item.granja.id}
              type="button"
              role="tab"
              aria-selected={item.granja.id === granja.id}
              className={`gp-granja-chip${item.granja.id === granja.id ? ' is-activa' : ''}`}
              onClick={() => { setGranjaId(item.granja.id); setGalponId(null); setEnDetalle(false) }}
            >
              <IcLeaf size={14} aria-hidden="true" /> {item.granja.nombre}
            </button>
          ))}
        </div>
      )}

      <section
        className="org-hero org-hero--granja"
        data-fase={fase}
        style={{ '--fondo': `url(${FONDOS_POR_FASE[fase]})` } as CSSProperties}
        aria-labelledby="gp-hero-titulo"
      >
        <div className="gp-hero-fondo" aria-hidden="true" />
        <img
          key={astro.tipo}
          className={`gp-hero-astro gp-hero-astro--${astro.tipo}`}
          src={astro.tipo === 'sol' ? solLowPoly : lunaLowPoly}
          alt=""
          aria-hidden="true"
          style={{ left: `${56 + ((astro.x - 44) / 42) * 34}%`, top: `${astro.y + 2}%` }}
        />
        <div className="gp-hero-velo" aria-hidden="true" />
        <div className="org-hero-texto">
          <span className="adm-eyebrow org-aparece" style={{ '--orden': 0 } as CSSProperties}>
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Ficha de granja
          </span>
          <h1 id="gp-hero-titulo" className="org-hero-titulo org-aparece" style={{ '--orden': 1 } as CSSProperties}>
            {granja.nombre}
          </h1>
          <div className="org-hero-chips org-aparece" style={{ '--orden': 2 } as CSSProperties}>
            <span className={`org-hero-chip org-hero-chip--estado${granja.activa ? ' is-activa' : ''}`}>
              <span className="org-hero-latido" aria-hidden="true" />
              {granja.activa ? 'Activa' : 'Inactiva'}
            </span>
            {progreso && progreso.pendientes.length === 0 && (
              <span className="org-hero-chip"><IcCheck size={12} aria-hidden="true" /> Datos completos</span>
            )}
          </div>
          <dl className="org-hero-datos org-aparece" style={{ '--orden': 3 } as CSSProperties}>
            <div><dt>Ubicación</dt><dd>{ubicacion || 'Sin registrar'}</dd></div>
            <div><dt>Registrada desde</dt><dd>{formatearFechaCalendario(granja.fecha_creacion)}</dd></div>
          </dl>
          <p className="org-hero-subtitulo org-aparece" style={{ '--orden': 4 } as CSSProperties}>
            Elige un galpón para ver su lote, su ambiente y el siguiente paso que necesita.
          </p>
          <div className="org-hero-acciones org-aparece" style={{ '--orden': 5 } as CSSProperties}>
            {progreso && progreso.pendientes.length > 0 ? (
              <button type="button" className="adm-btn adm-btn--primario" onClick={() => abrirPendiente(progreso.pendientes[0])}>
                Completar datos · {progreso.completos}/{progreso.total}
                <IcArrowRight size={15} aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void recargarTodo()} disabled={cargando}>
              <IcRefresh size={15} aria-hidden="true" />
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        <div className="org-hero-escena">
          <Suspense fallback={<div className="org-hero-escena-cargando" aria-hidden="true" />}>
            <EscenaGranja nombre={granja.nombre} />
          </Suspense>
          <p className="org-hero-escena-nota org-hero-escena-nota--pista">Tu granja en 3D.</p>
        </div>

        <ul className="org-hero-indicadores" aria-label={`Resumen de ${granja.nombre}`}>
          {indicadores.map((dato, indice) => (
            <li
              key={dato.label}
              className={`org-hero-indicador org-hero-indicador--${dato.tono} org-aparece`}
              style={{ '--orden': indice + 3 } as CSSProperties}
            >
              <span className="org-hero-indicador-label">{dato.label}</span>
              <strong className="org-hero-indicador-valor">
                <NumeroAnimado valor={dato.valor} retrasoMs={180 + indice * 70} />
                {dato.total !== undefined && <span className="gp-indicador-total">/{dato.total}</span>}
              </strong>
            </li>
          ))}
        </ul>
      </section>

      {error && <div className="adm-alerta" role="alert"><span>{error}</span><button type="button" onClick={() => void recargarTodo()}>Reintentar</button></div>}

      <div id="gp-galpones" className={`gp-layout${enDetalle ? ' is-detalle' : ''}`}>
        <aside className="gp-columna-lista" aria-label="Tus galpones">
          <div className="gp-columna-cabecera">
            <h2>Tus galpones</h2>
            <span className="gp-conteo">{galpones.length}</span>
          </div>
          <ListaGalpones galpones={galpones} galponId={galpon?.id ?? null} onSeleccionar={elegirGalpon} />
        </aside>

        {galpon && paso && (
          <section className="gp-detalle" aria-labelledby="gp-detalle-titulo">
            <button type="button" className="gp-volver" onClick={() => setEnDetalle(false)}>
              <IcChevronRight size={14} aria-hidden="true" className="gp-volver-icono" /> Tus galpones
            </button>
            <header className="gp-detalle-cabecera">
              <span className="adm-eyebrow">
                <span className="adm-eyebrow-punto" aria-hidden="true" />
                Galpón seleccionado
              </span>
              <h2 id="gp-detalle-titulo">{galpon.nombre} <code>{galpon.codigo}</code></h2>
            </header>

            <Tabs.Root value={pestana} onValueChange={(valor) => setPestana(valor as Pestana)}>
              <Tabs.List className="gp-pestanas" aria-label={`Información de ${galpon.nombre}`}>
                <Tabs.Trigger value="resumen" className="gp-pestana">Resumen</Tabs.Trigger>
                <Tabs.Trigger value="lote" className="gp-pestana">Lote</Tabs.Trigger>
                <Tabs.Trigger value="bitacora" className="gp-pestana">Bitácora</Tabs.Trigger>
                <Tabs.Trigger value="ambiente" className="gp-pestana">Ambiente</Tabs.Trigger>
                <Tabs.Trigger value="umbrales" className="gp-pestana">Umbrales</Tabs.Trigger>
                <Tabs.Trigger value="alertas" className="gp-pestana">
                  Alertas
                  {galpon.alertasAbiertas > 0 && <span className="gp-pestana-conteo">{galpon.alertasAbiertas}</span>}
                </Tabs.Trigger>
                <Tabs.Trigger value="datos" className="gp-pestana">Datos</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="resumen" className="gp-contenido">
                <ResumenPestana galpon={galpon} indicador={indicador} paso={paso} curvaLote={curvaLote} onDestino={irADestino} onNavegar={irA} />
              </Tabs.Content>
              <Tabs.Content value="lote" className="gp-contenido">
                <LotePestana
                  galpon={galpon}
                  indicador={indicador}
                  consumo={galpon.loteEnCurso ? consumoPorLote.get(galpon.loteEnCurso.id) : undefined}
                  onEditarDatos={(lote) => setDatos({ tipo: 'lote', lote })}
                  onNavegar={irA}
                />
              </Tabs.Content>
              <Tabs.Content value="bitacora" className="gp-contenido">
                {galpon.loteEnCurso ? (
                  <BitacoraPestana
                    key={`${galpon.loteEnCurso.id}-${vistaBitacora}`}
                    lote={galpon.loteEnCurso}
                    vistaInicial={vistaBitacora}
                  />
                ) : (
                  <div className="gp-curva-vacia">La bitácora se abre cuando el galpón tiene un lote en curso.</div>
                )}
              </Tabs.Content>
              <Tabs.Content value="ambiente" className="gp-contenido">
                <AmbientePestana
                  galpon={galpon}
                  revision={revision}
                  onCompletarUbicacion={puedeCompletarDatos(getRol()) ? () => setDatos({ tipo: 'granja', granja }) : undefined}
                />
              </Tabs.Content>
              <Tabs.Content value="umbrales" className="gp-contenido">
                <UmbralesPestana galpon={galpon} puedeConfigurar={permisosOperativosDeGalpon(getRol()).configurar} />
              </Tabs.Content>
              <Tabs.Content value="alertas" className="gp-contenido">
                <Suspense fallback={<CargandoPestana />}>
                  <AlertasPage key={galpon.id} galponFijo={galpon.id} />
                </Suspense>
              </Tabs.Content>
              <Tabs.Content value="datos" className="gp-contenido">
                <DatosPestana
                  granja={granja}
                  galpon={galpon}
                  onEditarGranja={() => setDatos({ tipo: 'granja', granja })}
                  onEditarLote={(lote) => setDatos({ tipo: 'lote', lote })}
                />
              </Tabs.Content>
            </Tabs.Root>
          </section>
        )}
      </div>

      {datos?.tipo === 'granja' && (
        <ModalDatosGranja granja={datos.granja} onCerrar={() => setDatos(null)} onGuardado={recargarTodo} />
      )}
      {datos?.tipo === 'lote' && (
        <ModalDatosLote
          lote={datos.lote}
          lineasGeneticas={lineasGeneticas}
          proveedores={proveedores}
          onCerrar={() => setDatos(null)}
          onGuardado={recargarTodo}
        />
      )}
    </div>
  )
}

export default GranjasPropietario
