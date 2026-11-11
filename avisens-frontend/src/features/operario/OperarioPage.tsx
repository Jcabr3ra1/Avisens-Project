import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsuario } from '@shared/api'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import BotonActualizar from '@shared/ui/BotonActualizar/BotonActualizar'
import Cargando from '@shared/ui/Estados/Cargando'
import SinGalponesAsignados from '@shared/ui/Estados/SinGalponesAsignados'
import { IcBarn, IcEgg, IcLeaf, IcUsers } from '@shared/ui/icons/icons'
import '@shared/ui/admin/AdminKit.css'
import ModalRegistroOperario from './components/ModalRegistroOperario'
import TarjetaJornada from './components/TarjetaJornada'
import { useJornadaOperario } from './hooks/useJornadaOperario'
import { resumirJornada, type JornadaOperario } from './model/jornadaOperario'
import './OperarioPage.css'

type RegistroAbierto = { tipo: 'mortalidad' | 'consumo'; jornada: JornadaOperario } | null

// Inicio del operario. Usa las mismas piezas que las pantallas del
// administrador y del propietario (cabecera, franja de resumen, avisos y
// estados vacíos del kit compartido) para que el rol se vea igual que el resto.
function OperarioPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const jornada = useJornadaOperario()
  const [registroAbierto, setRegistroAbierto] = useState<RegistroAbierto>(null)
  const nombre = usuario?.nombre.trim().split(/\s+/)[0] || 'operario'
  const resumen = useMemo(() => resumirJornada(jornada.jornadas), [jornada.jornadas])
  const primeraCarga = jornada.cargando && jornada.jornadas.length === 0

  const stats: Stat[] = [
    { label: 'Galpones a tu cargo', valor: resumen.galpones, icono: <IcBarn size={18} />, tono: 'neutral' },
    { label: 'Lotes activos', valor: resumen.lotesActivos, icono: <IcEgg size={18} />, tono: 'ok' },
    { label: 'Aves en seguimiento', valor: resumen.avesEnSeguimiento, icono: <IcUsers size={18} />, tono: 'info' },
    {
      label: 'Galpones sin lote',
      valor: resumen.galponesSinLote,
      icono: <IcLeaf size={18} />,
      tono: resumen.galponesSinLote > 0 ? 'aviso' : 'neutral',
    },
  ]

  return (
    <div className="page-container operario-page adm-page">
      <CabeceraAdmin
        eyebrow="Mi jornada"
        titulo={`Hola, ${nombre}`}
        subtitulo="Registra lo que sucede hoy en los galpones a tu cargo."
        acciones={<BotonActualizar cargando={jornada.cargando} onActualizar={jornada.recargar} />}
      />

      {jornada.error && (
        <div className="adm-alerta" role="alert">
          <span>{jornada.error}</span>
          <button type="button" onClick={() => void jornada.recargar()}>Reintentar</button>
        </div>
      )}

      {jornada.mensaje && <p className="operario-success" role="status">{jornada.mensaje}</p>}

      {primeraCarga ? (
        <Cargando texto="Cargando tu jornada…" />
      ) : jornada.jornadas.length === 0 ? (
        <SinGalponesAsignados queVerias="tu jornada: el lote de cada galpón y los botones para registrar mortalidad y consumo" />
      ) : (
        <>
          <TarjetasResumen stats={stats} etiqueta="Resumen de tu jornada" />
          <section className="operario-galpones" aria-label="Galpones asignados">
            {jornada.jornadas.map((item) => (
              <TarjetaJornada
                key={item.galpon.id}
                jornada={item}
                onRegistrarMortalidad={() => setRegistroAbierto({ tipo: 'mortalidad', jornada: item })}
                onRegistrarConsumo={() => setRegistroAbierto({ tipo: 'consumo', jornada: item })}
                onVerAlertas={() => navigate('/alertas')}
                onVerCrecimiento={() => item.lote && navigate(`/guia-crecimiento?lote=${item.lote.id}`)}
              />
            ))}
          </section>
        </>
      )}

      {registroAbierto && (
        <ModalRegistroOperario
          tipo={registroAbierto.tipo}
          jornada={registroAbierto.jornada}
          guardando={jornada.guardando}
          onCerrar={() => setRegistroAbierto(null)}
          onRegistrarMortalidad={jornada.registrarMortalidad}
          onRegistrarConsumo={jornada.registrarConsumo}
        />
      )}
    </div>
  )
}

export default OperarioPage
