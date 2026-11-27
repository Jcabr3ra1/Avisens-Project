export type RegistroAuditoria = {
  id: number
  usuario_id: number | null
  accion: string
  entidad_afectada: string
  registro_id: number | null
  datos_antes: unknown
  datos_despues: unknown
  ip_origen: string | null
  user_agent: string | null
  fecha_hora: string
  usuario: { nombre_completo: string; email: string | null } | null
}

export type ListadoAuditoria = {
  registros: RegistroAuditoria[]
  total: number
  pagina: number
  totalPaginas: number
}

export type FiltrosAuditoria = {
  accion?: string
  entidad?: string
  usuario_id?: number
  desde?: string
  hasta?: string
}

export type OpcionesAuditoria = {
  acciones: string[]
  entidades: string[]
  usuarios: Array<{ id: number; nombre_completo: string }>
}

export type PeriodoRapido = 'todo' | 'hoy' | '7d' | '30d'

export type CambioCampo = {
  campo: string
  antes: string | null
  despues: string | null
  tipo: 'agregado' | 'modificado' | 'eliminado' | 'valor'
}

export function hayFiltros(filtros: FiltrosAuditoria): boolean {
  return Object.values(filtros).some((valor) => valor !== undefined && valor !== '')
}

export function contarFiltrosActivos(filtros: FiltrosAuditoria): number {
  let cuenta = 0
  if (filtros.accion) cuenta += 1
  if (filtros.entidad) cuenta += 1
  if (filtros.usuario_id !== undefined) cuenta += 1
  if (filtros.desde || filtros.hasta) cuenta += 1
  return cuenta
}

export function rangoValido(filtros: FiltrosAuditoria): boolean {
  return !filtros.desde || !filtros.hasta || filtros.desde <= filtros.hasta
}

function aFechaLocalIso(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function rangoDePeriodo(
  periodo: PeriodoRapido,
  ahora: Date = new Date(),
): { desde?: string; hasta?: string } {
  if (periodo === 'todo') return { desde: undefined, hasta: undefined }
  const hasta = aFechaLocalIso(ahora)
  if (periodo === 'hoy') return { desde: hasta, hasta }
  const dias = periodo === '7d' ? 6 : 29
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dias)
  return { desde: aFechaLocalIso(inicio), hasta }
}

export function periodoActivo(
  filtros: FiltrosAuditoria,
  ahora: Date = new Date(),
): PeriodoRapido | null {
  if (!filtros.desde && !filtros.hasta) return 'todo'
  for (const periodo of ['hoy', '7d', '30d'] as const) {
    const rango = rangoDePeriodo(periodo, ahora)
    if (filtros.desde === rango.desde && filtros.hasta === rango.hasta) return periodo
  }
  return null
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

export function formatearValorCampo(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'number' || typeof valor === 'string') return String(valor)
  return JSON.stringify(valor)
}

export function extraerCambios(antes: unknown, despues: unknown): CambioCampo[] {
  const tieneAntes = esObjetoPlano(antes)
  const tieneDespues = esObjetoPlano(despues)

  if (tieneAntes && tieneDespues) {
    const claves = Array.from(new Set([...Object.keys(antes), ...Object.keys(despues)]))
    const resultado: CambioCampo[] = []
    for (const campo of claves) {
      const enAntes = Object.prototype.hasOwnProperty.call(antes, campo)
      const enDespues = Object.prototype.hasOwnProperty.call(despues, campo)
      const serialAntes = JSON.stringify(antes[campo])
      const serialDespues = JSON.stringify(despues[campo])
      if (enAntes && enDespues) {
        if (serialAntes !== serialDespues) {
          resultado.push({
            campo,
            antes: formatearValorCampo(antes[campo]),
            despues: formatearValorCampo(despues[campo]),
            tipo: 'modificado',
          })
        }
      } else if (!enAntes && enDespues) {
        resultado.push({
          campo,
          antes: null,
          despues: formatearValorCampo(despues[campo]),
          tipo: 'agregado',
        })
      } else if (enAntes && !enDespues) {
        resultado.push({
          campo,
          antes: formatearValorCampo(antes[campo]),
          despues: null,
          tipo: 'eliminado',
        })
      }
    }
    return resultado
  }

  if (tieneDespues) {
    return Object.entries(despues).map(([campo, valor]) => ({
      campo,
      antes: null,
      despues: formatearValorCampo(valor),
      tipo: 'valor',
    }))
  }

  if (tieneAntes) {
    return Object.entries(antes).map(([campo, valor]) => ({
      campo,
      antes: formatearValorCampo(valor),
      despues: null,
      tipo: 'eliminado',
    }))
  }

  return []
}

export function resumirNavegador(userAgent: string | null): string {
  if (!userAgent) return '—'
  const ua = userAgent.trim()
  if (!ua) return '—'

  let navegador = ''
  if (/Edg\//i.test(ua)) navegador = 'Edge'
  else if (/OPR\/|Opera/i.test(ua)) navegador = 'Opera'
  else if (/Firefox\//i.test(ua)) navegador = 'Firefox'
  else if (/Chrome\//i.test(ua)) navegador = 'Chrome'
  else if (/Safari\//i.test(ua)) navegador = 'Safari'
  else if (/curl|insomnia|bruno|postman/i.test(ua)) navegador = ua.split(/[\s/]/)[0]

  let sistema = ''
  if (/Android/i.test(ua)) sistema = 'Android'
  else if (/iPhone|iPad|iOS/i.test(ua)) sistema = 'iOS'
  else if (/Macintosh|Mac OS X/i.test(ua)) sistema = 'macOS'
  else if (/Windows/i.test(ua)) sistema = 'Windows'
  else if (/Linux/i.test(ua)) sistema = 'Linux'

  if (navegador && sistema) return `${navegador} · ${sistema}`
  return navegador || sistema || ua.slice(0, 48)
}
