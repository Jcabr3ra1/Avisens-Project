import { useEffect, useRef, useState } from 'react'
import { IcRefresh } from '@shared/ui/icons/icons'
import { haceCuanto } from '@shared/utils/tiempoRelativo'
import '@shared/ui/admin/AdminKit.css'
import './BotonActualizar.css'

type Props = {
  // Carga que maneja la pantalla (la primera, o la de su hook). Opcional:
  // si onActualizar devuelve una promesa, el botón también la sigue.
  cargando?: boolean
  onActualizar: () => void | Promise<unknown>
}

// Botón «Actualizar» de las cabeceras. Mientras la petición corre, el icono
// gira y el botón se deshabilita; al terminar, muestra cuándo fue la última
// actualización para que se note que de verdad se consultó el servidor
// (auditoría QA 2026-10-30, punto 5 del plan de acción).
function BotonActualizar({ cargando = false, onActualizar }: Props) {
  const [enCurso, setEnCurso] = useState(false)
  const [ultima, setUltima] = useState<Date | null>(() => (cargando ? null : new Date()))
  const [, setTic] = useState(0)
  const ocupado = cargando || enCurso
  const estabaOcupado = useRef(ocupado)

  // Cuando una carga termina (la del botón o la de la pantalla), se anota la hora.
  useEffect(() => {
    if (estabaOcupado.current && !ocupado) setUltima(new Date())
    estabaOcupado.current = ocupado
  }, [ocupado])

  // Refresca el texto «hace X s» sin volver a pedir datos.
  useEffect(() => {
    const intervalo = window.setInterval(() => setTic((n) => n + 1), 15000)
    return () => window.clearInterval(intervalo)
  }, [])

  async function actualizar() {
    setEnCurso(true)
    try {
      await onActualizar()
    } finally {
      setEnCurso(false)
    }
  }

  return (
    <div className="btn-actualizar">
      {ultima && !ocupado && (
        <span className="btn-actualizar-hora" role="status">
          Actualizado {haceCuanto(ultima)}
        </span>
      )}
      <button
        type="button"
        className="adm-btn adm-btn--secundario"
        onClick={() => void actualizar()}
        disabled={ocupado}
        aria-busy={ocupado}
      >
        <IcRefresh
          size={14}
          aria-hidden="true"
          className={ocupado ? 'btn-actualizar-icono is-girando' : 'btn-actualizar-icono'}
        />
        {ocupado ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  )
}

export default BotonActualizar
