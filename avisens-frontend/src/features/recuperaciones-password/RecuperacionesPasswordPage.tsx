import { useState } from 'react'
import PanelRecuperacion from './components/PanelRecuperacion'
import ResumenRecuperaciones from './components/ResumenRecuperaciones'
import TablaRecuperaciones from './components/TablaRecuperaciones'
import { useRecuperacionesPassword } from './hooks/useRecuperacionesPassword'
import type { RecuperacionPassword } from './model/recuperacionPassword'
import './RecuperacionesPassword.css'

function RecuperacionesPasswordPage() {
  const { solicitudes, cargando, error, cargar, aprobar, rechazar } = useRecuperacionesPassword()
  const [seleccionada, setSeleccionada] = useState<RecuperacionPassword | null>(null)

  return (
    <div className="page-container rec-page">
      <ResumenRecuperaciones solicitudes={solicitudes} />
      {error && <p className="rec-aviso rec-aviso--error" role="alert">{error} <button type="button" onClick={() => void cargar()}>Reintentar</button></p>}
      {cargando ? (
        <p className="rec-cargando" role="status">Cargando solicitudes…</p>
      ) : !error && solicitudes.length === 0 ? (
        <section className="rec-vacio">
          <h2>No hay solicitudes pendientes</h2>
          <p>Las solicitudes de propietarios y operarios aparecerán aquí para su revisión.</p>
        </section>
      ) : !error ? (
        <TablaRecuperaciones solicitudes={solicitudes} onAbrir={setSeleccionada} />
      ) : null}
      {seleccionada && <PanelRecuperacion solicitud={seleccionada} onCerrar={() => setSeleccionada(null)} onAprobar={aprobar} onRechazar={rechazar} />}
    </div>
  )
}

export default RecuperacionesPasswordPage
