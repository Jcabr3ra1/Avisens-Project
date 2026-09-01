import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IcPlus } from '@shared/ui/icons/icons'
import CabeceraAdmin, { type Miga } from '@shared/ui/admin/CabeceraAdmin'
import '@shared/ui/admin/AdminKit.css'
import PantallaHija from '@shared/ui/PantallaHija/PantallaHija'
import DispositivosDeGalpon from '@features/dispositivos/components/DispositivosDeGalpon'
import EquiposDeGalpon from '@features/equipos/components/EquiposDeGalpon'
import SensoresDeGalpon from '@features/sensores/components/SensoresDeGalpon'
import type { Galpon } from './api/galpones'
import BarraGalpones from './components/BarraGalpones'
import FormularioGalpon from './components/FormularioGalpon'
import ResumenGalpones from './components/ResumenGalpones'
import TablaGalpones from './components/TablaGalpones'
import { useFiltroGalpones } from './hooks/useFiltroGalpones'
import { useFormularioGalpon } from './hooks/useFormularioGalpon'
import { useGalpones } from './hooks/useGalpones'
import { calcularResumenGalpones } from './model/galponVista'
import './GalponesPage.css'

function GalponesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const gestion = useGalpones()
  const granjaParam = searchParams.get('granja')
  const granjaId = Number(granjaParam)
  const tieneContextoDeGranja = granjaParam !== null && Number.isInteger(granjaId)
  const granjaSeleccionada = tieneContextoDeGranja
    ? gestion.granjas.find((granja) => granja.id === granjaId)
    : undefined
  const granjasDisponibles = useMemo(() => {
    if (granjaSeleccionada) return [granjaSeleccionada]
    return tieneContextoDeGranja ? [] : gestion.granjas
  }, [gestion.granjas, granjaSeleccionada, tieneContextoDeGranja])
  const galponesDeGranja = useMemo(() => {
    if (granjaSeleccionada) {
      return gestion.galpones.filter((galpon) => galpon.granja.id === granjaSeleccionada.id)
    }
    return tieneContextoDeGranja ? [] : gestion.galpones
  }, [gestion.galpones, granjaSeleccionada, tieneContextoDeGranja])
  const filtro = useFiltroGalpones(galponesDeGranja)
  const formulario = useFormularioGalpon(gestion.guardar)
  const resumen = useMemo(() => calcularResumenGalpones(galponesDeGranja), [galponesDeGranja])
  const [galponSensores, setGalponSensores] = useState<Galpon | null>(null)
  const [galponDispositivos, setGalponDispositivos] = useState<Galpon | null>(null)
  const [galponEquipos, setGalponEquipos] = useState<Galpon | null>(null)

  const migas: Miga[] = granjaSeleccionada
    ? [
        { label: 'Granjas', to: '/granjas' },
        { label: granjaSeleccionada.nombre },
      ]
    : [{ label: 'Granjas', to: '/granjas' }, { label: 'Galpones' }]

  function abrirCrear() {
    const granjaId = granjasDisponibles[0]?.id
    if (granjaId) formulario.abrirCrear(granjaId)
  }

  function confirmarEliminacion(galpon: Galpon) {
    const confirmado = window.confirm(
      `¿Eliminar permanentemente el galpón "${galpon.nombre}"? Esta acción no se puede deshacer.`,
    )
    if (confirmado) void gestion.eliminar(galpon)
  }

  return (
    <div className="page-container adm-page">
      <CabeceraAdmin
        titulo="Galpones"
        contexto={granjaSeleccionada?.nombre}
        subtitulo={
          granjaSeleccionada
            ? 'Los espacios físicos de esta granja. Cada galpón aloja lotes y concentra sus sensores, dispositivos y equipos.'
            : 'Capacidad y características físicas de cada galpón. De aquí cuelgan los lotes.'
        }
        migas={migas}
        acciones={
          <>
            {granjaSeleccionada && (
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                onClick={() => navigate('/granjas')}
              >
                Volver a granjas
              </button>
            )}
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={abrirCrear}
              disabled={gestion.cargando || granjasDisponibles.length === 0}
            >
              <IcPlus size={15} aria-hidden="true" />
              Nuevo galpón
            </button>
          </>
        }
      />

      <ResumenGalpones resumen={resumen} />

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {!gestion.cargando && granjasDisponibles.length === 0 && (
        <p className="adm-aviso">Necesitas una granja activa antes de registrar galpones.</p>
      )}

      <section className="adm-panel" aria-label="Listado de galpones">
        {galponesDeGranja.length > 0 && (
          <BarraGalpones
            busqueda={filtro.busqueda}
            estado={filtro.estado}
            visibles={filtro.visibles.length}
            total={galponesDeGranja.length}
            onBuscar={filtro.setBusqueda}
            onCambiarEstado={filtro.setEstado}
          />
        )}
        <TablaGalpones
          galpones={filtro.visibles}
          cargando={gestion.cargando}
          onEditar={formulario.abrirEditar}
          onAlternar={(galpon) => void gestion.alternarActivo(galpon)}
          onEliminar={confirmarEliminacion}
          onVerLotes={(galpon) => navigate(`/lotes?galpon=${galpon.id}`)}
          onVerSensores={setGalponSensores}
          onVerDispositivos={setGalponDispositivos}
          onVerEquipos={setGalponEquipos}
        />
      </section>

      {formulario.abierto && (
        <FormularioGalpon form={formulario.form} modoEdicion={formulario.modoEdicion} granjas={granjasDisponibles} guardando={formulario.guardando} error={formulario.error} onCambiar={formulario.cambiar} onGuardar={formulario.guardar} onCerrar={formulario.cerrar} />
      )}

      {galponEquipos && (
        <PantallaHija
          titulo={`Equipos · ${galponEquipos.nombre}`}
          subtitulo={`${galponEquipos.codigo} · ${galponEquipos.granja.nombre}`}
          onCerrar={() => setGalponEquipos(null)}
        >
          <EquiposDeGalpon galpon={galponEquipos} />
        </PantallaHija>
      )}

      {galponDispositivos && (
        <PantallaHija
          titulo={`Dispositivos · ${galponDispositivos.nombre}`}
          subtitulo={`${galponDispositivos.codigo} · ${galponDispositivos.granja.nombre}`}
          onCerrar={() => setGalponDispositivos(null)}
        >
          <DispositivosDeGalpon galpon={galponDispositivos} />
        </PantallaHija>
      )}

      {galponSensores && (
        <PantallaHija
          titulo={`Sensores · ${galponSensores.nombre}`}
          subtitulo={`${galponSensores.codigo} · ${galponSensores.granja.nombre}`}
          onCerrar={() => setGalponSensores(null)}
        >
          <SensoresDeGalpon galpon={galponSensores} />
        </PantallaHija>
      )}
    </div>
  )
}

export default GalponesPage
