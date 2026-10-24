import { useState, type ReactNode } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { motion, useReducedMotion } from 'motion/react'

type Vista = 'ambiente' | 'lote' | 'plano'

type Props = {
  titulo: string
  detalle: string
  resumenAmbiente: string | null
  ambiente: ReactNode
  lote: ReactNode
  plano: ReactNode
}

const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: 'ambiente', etiqueta: 'Ambiente' },
  { id: 'lote', etiqueta: 'Lote' },
  { id: 'plano', etiqueta: 'Plano' },
]

function EscenarioGalpon({ titulo, detalle, resumenAmbiente, ambiente, lote, plano }: Props) {
  const [vista, setVista] = useState<Vista>('ambiente')
  const sinMovimiento = useReducedMotion()
  const contenido: Record<Vista, ReactNode> = { ambiente, lote, plano }

  return (
    <section className="escenario-galpon" aria-labelledby="escenario-titulo">
      <header className="escenario-cabecera">
        <div>
          <h2 id="escenario-titulo" className="escenario-titulo">{titulo}</h2>
          <p className="escenario-detalle">{detalle}</p>
        </div>
        {resumenAmbiente && <span className="escenario-estado">{resumenAmbiente}</span>}
      </header>

      <Tabs.Root value={vista} onValueChange={(valor) => setVista(valor as Vista)}>
        <Tabs.List className="escenario-tabs" aria-label="Qué quieres ver de este galpón">
          {VISTAS.map((item) => (
            <Tabs.Trigger key={item.id} value={item.id} className="escenario-tab">
              {vista === item.id && (
                <motion.span
                  layoutId="escenario-indicador"
                  className="escenario-indicador"
                  transition={sinMovimiento ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
                />
              )}
              <span className="escenario-tab-texto">{item.etiqueta}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {VISTAS.map((item) => (
          <Tabs.Content key={item.id} value={item.id} className="escenario-contenido">
            <motion.div
              initial={sinMovimiento ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: sinMovimiento ? 0 : 0.24, ease: [0.23, 1, 0.32, 1] }}
            >
              {contenido[item.id]}
            </motion.div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  )
}

export default EscenarioGalpon
