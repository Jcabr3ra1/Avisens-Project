import { IcChat } from '@shared/ui/icons/icons'

function ComunicacionFab({ onAbrir }: { onAbrir: () => void }) {
  return (
    <button type="button" className="comunicacion-fab" onClick={onAbrir} aria-label="Abrir comunicación del equipo">
      <IcChat size={27} aria-hidden="true" />
    </button>
  )
}

export default ComunicacionFab
