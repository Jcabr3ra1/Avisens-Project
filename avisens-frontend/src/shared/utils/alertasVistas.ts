// alertasVistas.ts — Recuerda qué alertas ya vio el usuario (guardado en el
// propio navegador), para que el avatar AVIA no siga avisando de algo que la
// persona ya miró en la página de Alertas. La alerta sigue existiendo y
// contando en los totales — esto solo apaga la notificación, no la alerta.
const CLAVE = 'avisens_alertas_vistas'

function leer(): Set<number> {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return new Set(guardado ? (JSON.parse(guardado) as number[]) : [])
  } catch {
    return new Set()
  }
}

// Marca uno o varios ids de alerta como ya vistos.
export function marcarAlertasVistas(ids: number[]): void {
  if (ids.length === 0) return
  try {
    const vistas = leer()
    ids.forEach(id => vistas.add(id))
    localStorage.setItem(CLAVE, JSON.stringify([...vistas]))
  } catch {
    // localStorage no disponible (modo privado, etc.) — simplemente no persiste.
  }
}

// True si esa alerta ya fue vista antes.
export function alertaFueVista(id: number): boolean {
  return leer().has(id)
}
