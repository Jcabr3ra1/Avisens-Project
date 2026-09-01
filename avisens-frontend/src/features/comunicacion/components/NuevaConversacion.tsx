import { IcSearch, IcUsers } from '@shared/ui/icons/icons'
import type { ContactoChat } from '../api/chat'
import { useContactosChat } from '../hooks/useContactosChat'

type Props = {
  onElegir: (contacto: ContactoChat) => void
  onVolver: () => void
}

function NuevaConversacion({ onElegir, onVolver }: Props) {
  const { porRol, cargando, error, busqueda, setBusqueda } = useContactosChat(true)

  return (
    <section className="com-nueva" aria-label="Nueva conversación">
      <header className="com-nueva__head">
        <button type="button" className="com-volver" onClick={onVolver}>
          ← Conversaciones
        </button>
        <strong>Nueva conversación</strong>
      </header>

      <label className="com-buscador">
        <IcSearch size={15} aria-hidden="true" />
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar una persona…"
          aria-label="Buscar contacto"
        />
      </label>

      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}

      {cargando ? (
        <p className="comunicacion-cargando" role="status">Cargando contactos…</p>
      ) : porRol.length === 0 ? (
        <section className="comunicacion-empty">
          <span className="comunicacion-empty__icon" aria-hidden="true"><IcUsers size={28} /></span>
          <h3>{busqueda ? 'Nadie coincide con la búsqueda' : 'No hay contactos'}</h3>
          <p>
            {busqueda
              ? 'Prueba con otro nombre o revisa el rol de la persona.'
              : 'Solo puedes escribirle a personas de tu misma organización.'}
          </p>
        </section>
      ) : (
        <div className="com-contactos">
          {porRol.map(([rol, personas]) => (
            <div key={rol} className="com-contactos__grupo">
              <p className="com-contactos__rol">{rol}</p>
              {personas.map((contacto) => (
                <button
                  key={contacto.id}
                  type="button"
                  className="com-contacto"
                  onClick={() => onElegir(contacto)}
                >
                  <span className="com-avatar" aria-hidden="true">{contacto.iniciales}</span>
                  <span className="com-contacto__nombre">{contacto.nombre_completo}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default NuevaConversacion
