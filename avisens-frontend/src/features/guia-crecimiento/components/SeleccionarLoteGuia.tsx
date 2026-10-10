import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { mensajeDeError } from '@shared/utils/errores'

function SeleccionarLoteGuia() {
  const navegar = useNavigate()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loteId, setLoteId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    void listarLotes()
      .then((datos) => {
        if (vigente) setLotes(datos.filter((lote) => lote.estado === 'activo'))
      })
      .catch((errorCarga) => {
        if (vigente) setError(mensajeDeError(errorCarga, 'No se pudieron cargar los lotes activos.'))
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => { vigente = false }
  }, [revision])

  const seleccionado = lotes.find((lote) => String(lote.id) === loteId)

  function abrirGuia(evento: FormEvent) {
    evento.preventDefault()
    if (seleccionado && !cargando && !error) {
      navegar(`/guia-crecimiento?lote=${seleccionado.id}`)
    }
  }

  return (
    <div className="page-container adm-page guia-page">
      <CabeceraAdmin
        titulo="Guía de peso"
        subtitulo="Elige un lote activo para consultar su crecimiento y planificación."
        migas={[{ label: 'Granja' }, { label: 'Guía de peso' }]}
      />
      <section className="adm-panel guia-selector" aria-labelledby="seleccionar-lote-titulo">
        <h2 id="seleccionar-lote-titulo">Selecciona un lote</h2>
        {cargando ? (
          <p className="adm-vacio" role="status">Cargando lotes activos…</p>
        ) : error ? (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button>
          </div>
        ) : lotes.length === 0 ? (
          <p className="adm-aviso">No tienes lotes activos disponibles para consultar la guía.</p>
        ) : (
          <form className="guia-datos-panel" onSubmit={abrirGuia}>
            <label className="guia-campo">
              <span>Lote activo</span>
              <select value={loteId} onChange={(evento) => setLoteId(evento.target.value)} required>
                <option value="">Elige un lote</option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.codigo} · {lote.galpon.nombre} · {lote.galpon.granja.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="adm-btn adm-btn--primario" disabled={!seleccionado}>
              Ver guía de peso
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export default SeleccionarLoteGuia
