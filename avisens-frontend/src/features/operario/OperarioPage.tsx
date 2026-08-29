import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsuario } from '@shared/api'
import EncabezadoJornada from './components/EncabezadoJornada'
import EstadoVacioJornada from './components/EstadoVacioJornada'
import ModalRegistroOperario from './components/ModalRegistroOperario'
import TarjetaJornada from './components/TarjetaJornada'
import { useJornadaOperario } from './hooks/useJornadaOperario'
import type { JornadaOperario } from './model/jornadaOperario'
import './OperarioPage.css'

type RegistroAbierto = { tipo: 'mortalidad' | 'consumo'; jornada: JornadaOperario } | null

function OperarioPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const jornada = useJornadaOperario()
  const [registroAbierto, setRegistroAbierto] = useState<RegistroAbierto>(null)
  const nombre = usuario?.nombre.trim().split(/\s+/)[0] || 'operario'

  return (
    <div className="page-container operario-page">
      <EncabezadoJornada
        nombre={nombre}
        cargando={jornada.cargando}
        onRecargar={() => void jornada.recargar()}
      />

      {jornada.error && (
        <div className="operario-alert" role="alert">
          <span>{jornada.error}</span>
          <button type="button" onClick={() => void jornada.recargar()}>Reintentar</button>
        </div>
      )}

      {jornada.mensaje && <p className="operario-success" role="status">{jornada.mensaje}</p>}

      {jornada.cargando ? (
        <div className="operario-loading" role="status">Cargando tu jornada…</div>
      ) : jornada.jornadas.length === 0 ? (
        <EstadoVacioJornada />
      ) : (
        <section className="operario-galpones" aria-label="Galpones asignados">
          {jornada.jornadas.map((item) => (
            <TarjetaJornada
              key={item.galpon.id}
              jornada={item}
              onRegistrarMortalidad={() => setRegistroAbierto({ tipo: 'mortalidad', jornada: item })}
              onRegistrarConsumo={() => setRegistroAbierto({ tipo: 'consumo', jornada: item })}
              onVerAlertas={() => navigate('/alertas')}
            />
          ))}
        </section>
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
