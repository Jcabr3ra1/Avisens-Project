import type { NivelConfianza, RangoPrediccion, SeveridadAnomalia } from '@features/predicciones/api/predicciones'
import { formatearPeso } from './proyeccion'

type Magnitud = 'peso' | 'mortalidad' | 'consumo'

const ETIQUETAS_CONFIANZA: Record<NivelConfianza, string> = {
  alta: 'Confianza alta',
  media: 'Confianza media',
  baja: 'Confianza baja',
}

const ETIQUETAS_SEVERIDAD: Record<SeveridadAnomalia, string> = {
  alta: 'Urgente',
  media: 'Atención',
  baja: 'Revisar',
}

const unDecimal = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function etiquetaConfianza(nivel: NivelConfianza | undefined): string | null {
  return nivel ? ETIQUETAS_CONFIANZA[nivel] : null
}

export function etiquetaSeveridad(severidad: SeveridadAnomalia): string {
  return ETIQUETAS_SEVERIDAD[severidad]
}

function formatearExtremo(valor: number, magnitud: Magnitud): string {
  if (magnitud === 'peso') return formatearPeso(valor)
  if (magnitud === 'mortalidad') return `${unDecimal.format(valor)} %`
  return `${entero.format(valor)} kg`
}

export function textoDeRango(rango: RangoPrediccion | null | undefined, magnitud: Magnitud): string | null {
  if (!rango || !Number.isFinite(rango.min) || !Number.isFinite(rango.max) || rango.min > rango.max) return null
  const base = `Entre ${formatearExtremo(rango.min, magnitud)} y ${formatearExtremo(rango.max, magnitud)}`
  return rango.cobertura_pct ? `${base} · cubre cerca del ${rango.cobertura_pct} % de los casos` : base
}

export function resumenDeAlertas(resumen: { total: number; severidad_maxima: SeveridadAnomalia | 'ninguna' }): string {
  if (resumen.total === 0 || resumen.severidad_maxima === 'ninguna') {
    return 'Sin alertas: peso, consumo y mortalidad van dentro de lo esperado.'
  }
  const cantidad = resumen.total === 1 ? '1 alerta' : `${resumen.total} alertas`
  const gravedad = {
    alta: 'la más grave es urgente',
    media: 'la más grave requiere atención',
    baja: 'conviene revisarlas',
  }[resumen.severidad_maxima]
  return `${cantidad} · ${gravedad}.`
}
