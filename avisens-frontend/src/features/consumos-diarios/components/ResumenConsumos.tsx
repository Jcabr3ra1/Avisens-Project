import { IcDrop, IcSeed } from '@shared/ui/icons/icons'
import type { ConsumoDiario } from '../model/consumoDiario'
import { fechaDeHoy } from '@shared/utils/fechas'

function ResumenConsumos({ consumos }: { consumos: ConsumoDiario[] }) {
  const hoy = consumos.filter((consumo) => consumo.fecha.slice(0, 10) === fechaDeHoy())
  const alimento = hoy.reduce((total, consumo) => total + Number(consumo.alimento_kg ?? 0), 0)
  const agua = hoy.reduce((total, consumo) => total + Number(consumo.agua_litros ?? 0), 0)
  return <div className="cd-resumen"><div className="cd-intro"><span><IcSeed size={24} /></span><div><p>Producción diaria</p><h1>Consumos diarios</h1><small>Registra alimento y agua para seguir el bienestar de cada lote.</small></div></div><div className="cd-kpis"><div><b>{hoy.length}</b><small>Registros hoy</small></div><div><IcSeed size={15} /><b>{alimento.toLocaleString('es-CO')} kg</b><small>Alimento hoy</small></div><div><IcDrop size={15} /><b>{agua.toLocaleString('es-CO')} L</b><small>Agua hoy</small></div></div></div>
}
export default ResumenConsumos
