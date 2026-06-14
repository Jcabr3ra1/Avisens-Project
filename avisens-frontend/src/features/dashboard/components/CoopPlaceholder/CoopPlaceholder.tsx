import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  IcAlert, IcChevronDown, IcDrop, IcFan, IcPlus, IcRefresh, IcSeed, IcSettings, IcThermo, IcWind,
} from '../icons/icons'
import type { Galpon } from '../../model'
import './CoopPlaceholder.css'

type LayerId = 'ambiente' | 'alertas' | 'flujo'
type DeviceKind = 'sensor' | 'fan' | 'food' | 'water' | 'access'
type DeviceStatus = 'ok' | 'warn' | 'info' | 'pending'
type Side = 'left' | 'right'

type DeviceInstance = {
  zone: string
  label: string
  value: string
  status: DeviceStatus
}

type DeviceNode = {
  id: string
  kind: DeviceKind
  label: string
  zone: string
  value: string
  status: DeviceStatus
  side: Side
  buttonY: number
  anchorX: number
  anchorY: number
  note: string
  instances: DeviceInstance[]
}

const LAYERS: { id: LayerId; label: string }[] = [
  { id: 'ambiente', label: 'Ambiente' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'flujo', label: 'Flujo' },
]

const DEVICE_NODES: DeviceNode[] = [
  {
    id: 'temp-z2',
    kind: 'sensor',
    label: 'Temperatura',
    zone: 'Zona 2',
    value: '29.8 C',
    status: 'warn',
    side: 'left',
    buttonY: 22,
    anchorX: 40,
    anchorY: 30,
    note: 'Subio 1.4 C en 18 min. Activar ventilacion gradual.',
    instances: [
      { zone: 'Zona 1', label: 'Cabecera', value: '28.4 C', status: 'ok' },
      { zone: 'Zona 2', label: 'Centro', value: '29.8 C', status: 'warn' },
      { zone: 'Zona 3', label: 'Salida', value: '27.6 C', status: 'ok' },
    ],
  },
  {
    id: 'gate-entrada',
    kind: 'access',
    label: 'Acceso',
    zone: 'Entrada',
    value: 'Cerrado',
    status: 'info',
    side: 'left',
    buttonY: 52,
    anchorX: 22,
    anchorY: 64,
    note: 'Ultimo ingreso registrado hace 22 min.',
    instances: [
      { zone: 'Puerta principal', label: 'Entrada', value: 'Cerrado', status: 'info' },
      { zone: 'Puerta lateral', label: 'Servicio', value: 'Cerrado', status: 'info' },
    ],
  },
  {
    id: 'food-entrada',
    kind: 'food',
    label: 'Alimento',
    zone: 'Entrada',
    value: '245 kg',
    status: 'ok',
    side: 'left',
    buttonY: 82,
    anchorX: 30,
    anchorY: 68,
    note: 'Consumo estable, 2% sobre objetivo diario.',
    instances: [
      { zone: 'Linea A', label: 'Cabecera', value: '78 kg', status: 'ok' },
      { zone: 'Linea B', label: 'Centro', value: '92 kg', status: 'ok' },
      { zone: 'Linea C', label: 'Salida', value: '75 kg', status: 'ok' },
    ],
  },
  {
    id: 'fan-salida',
    kind: 'fan',
    label: 'Ventilacion',
    zone: 'Salida',
    value: '60%',
    status: 'info',
    side: 'right',
    buttonY: 22,
    anchorX: 74,
    anchorY: 28,
    note: '6 ventiladores activos. Respuesta automatica disponible.',
    instances: [
      { zone: 'Ventilador 1', label: 'Cabecera', value: '55%', status: 'ok' },
      { zone: 'Ventilador 2', label: 'Cabecera', value: '58%', status: 'ok' },
      { zone: 'Ventilador 3', label: 'Centro', value: '62%', status: 'info' },
      { zone: 'Ventilador 4', label: 'Centro', value: '60%', status: 'info' },
      { zone: 'Ventilador 5', label: 'Salida', value: '60%', status: 'info' },
      { zone: 'Ventilador 6', label: 'Salida', value: '65%', status: 'info' },
    ],
  },
  {
    id: 'hum-nucleo',
    kind: 'sensor',
    label: 'Humedad',
    zone: 'Nucleo',
    value: '58%',
    status: 'ok',
    side: 'right',
    buttonY: 52,
    anchorX: 62,
    anchorY: 50,
    note: 'Dentro del rango operativo para engorde.',
    instances: [
      { zone: 'Zona 1', label: 'Cabecera', value: '60%', status: 'ok' },
      { zone: 'Zona 2', label: 'Nucleo', value: '58%', status: 'ok' },
      { zone: 'Zona 3', label: 'Salida', value: '55%', status: 'ok' },
    ],
  },
  {
    id: 'water-linea',
    kind: 'water',
    label: 'Agua',
    zone: 'Linea central',
    value: '1,125 L',
    status: 'ok',
    side: 'right',
    buttonY: 82,
    anchorX: 68,
    anchorY: 68,
    note: 'Ratio agua/alimento 4.6:1, sin fugas detectadas.',
    instances: [
      { zone: 'Linea A', label: 'Norte', value: '380 L', status: 'ok' },
      { zone: 'Linea B', label: 'Central', value: '420 L', status: 'ok' },
      { zone: 'Linea C', label: 'Sur', value: '325 L', status: 'ok' },
    ],
  },
]

const KIND_SINGULAR: Record<DeviceKind, string> = {
  sensor: 'sensor',
  fan: 'ventilador',
  food: 'comedero',
  water: 'punto de agua',
  access: 'acceso',
}

const statusLabel: Record<DeviceStatus, string> = {
  ok: 'Operativo',
  warn: 'Atencion',
  info: 'Monitoreo',
  pending: 'Pendiente',
}

const getDeviceIcon = (kind: DeviceKind, size = 15) => {
  if (kind === 'fan') return <IcFan size={size} />
  if (kind === 'food') return <IcSeed size={size} />
  if (kind === 'water') return <IcDrop size={size} />
  if (kind === 'access') return <IcWind size={size} />
  return <IcThermo size={size} />
}

const CoopPlaceholder = ({ galpon }: { galpon: Galpon }) => {
  const [layer, setLayer] = useState<LayerId>('ambiente')
  const [activeNodeId, setActiveNodeId] = useState('temp-z2')
  const [showList, setShowList] = useState(false)
  const [extras, setExtras] = useState<Record<string, DeviceInstance[]>>({})

  const activeNode = useMemo(
    () => DEVICE_NODES.find((n) => n.id === activeNodeId) ?? DEVICE_NODES[0],
    [activeNodeId],
  )

  const activeInstances = useMemo(
    () => [...activeNode.instances, ...(extras[activeNode.id] ?? [])],
    [activeNode, extras],
  )

  const selectNode = (id: string) => {
    setActiveNodeId(id)
    setShowList(false)
  }

  const handleAddInstance = () => {
    const nextIndex = activeInstances.length + 1
    const newInstance: DeviceInstance = {
      zone: `Nuevo ${KIND_SINGULAR[activeNode.kind]} ${nextIndex}`,
      label: 'Sin asignar',
      value: 'Sin datos',
      status: 'pending',
    }
    setExtras((prev) => ({
      ...prev,
      [activeNode.id]: [...(prev[activeNode.id] ?? []), newInstance],
    }))
    setShowList(true)
  }

  return (
    <section className={`dash-coop-placeholder layer-${layer}`}>
      <div className="dash-coop-top">
        <div>
          <div className="dash-coop-kicker">Mapa operativo del galpon</div>
          <div className="dash-coop-title">{galpon.nombre}</div>
          <div className="dash-coop-meta">
            {galpon.status === 'empty' ? 'Sin lote activo' : `${galpon.aves.toLocaleString('es-CO')} aves / dia ${galpon.dia}`}
          </div>
        </div>

        <div className="dash-coop-lot">
          <LotStat label="Dia" value={galpon.dia || 0} />
          <LotStat label="Aves" value={galpon.aves.toLocaleString('es-CO')} />
          <LotStat label="Mortalidad" value="2.1%" tone="warn" />
          <LotStat label="Peso prom." value="1.42 kg" />
          <LotStat label="Lote" value="L-2026-08" />
        </div>
      </div>

      <div className="dash-coop-controls">
        <div className="dash-coop-toolbar" aria-label="Capas del mapa">
          {LAYERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`dash-coop-layer${layer === item.id ? ' active' : ''}`}
              onClick={() => setLayer(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-coop-body">
        <div className="dash-coop-map">
          <div className="dash-coop-stage">
            <div className="dash-coop-illustration-wrap">
              <img
                className="dash-coop-illustration"
                src="/assets/galpon-map.png"
                alt=""
                draggable={false}
              />
            </div>

            <span className="dash-coop-flow flow-a" />
            <span className="dash-coop-flow flow-b" />

            <svg
              className="dash-coop-leaders"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {DEVICE_NODES.map((node) => {
                const isActive = activeNode.id === node.id
                const startX = node.side === 'left' ? 17 : 83
                return (
                  <line
                    key={node.id}
                    x1={startX}
                    y1={node.buttonY}
                    x2={node.anchorX}
                    y2={node.anchorY}
                    className={`dash-coop-leader status-${node.status}${isActive ? ' active' : ''}`}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
            </svg>

            {DEVICE_NODES.map((node) => {
              const isActive = activeNode.id === node.id
              return (
                <span
                  key={`anchor-${node.id}`}
                  className={`dash-coop-anchor status-${node.status}${isActive ? ' active' : ''}`}
                  style={{ left: `${node.anchorX}%`, top: `${node.anchorY}%` }}
                  aria-hidden="true"
                />
              )
            })}

            {DEVICE_NODES.map((node) => {
              const isActive = activeNode.id === node.id
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`dash-coop-callout side-${node.side} status-${node.status}${isActive ? ' active' : ''}`}
                  style={{ top: `${node.buttonY}%` }}
                  onClick={() => selectNode(node.id)}
                  aria-label={`${node.label}: ${node.value}`}
                >
                  <span className="dash-coop-callout-icon">{getDeviceIcon(node.kind)}</span>
                  <span className="dash-coop-callout-text">
                    <span className="dash-coop-callout-label">{node.label}</span>
                    <span className="mono dash-coop-callout-value">{node.value}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className={`dash-coop-inspector status-${activeNode.status}`}>
          <div className="dash-coop-inspector-head">
            <div className="dash-coop-inspector-icon">{getDeviceIcon(activeNode.kind, 17)}</div>
            <div>
              <div className="dash-coop-inspector-label">{activeNode.label}</div>
              <div className="dash-coop-inspector-zone">{activeNode.zone}</div>
            </div>
          </div>
          <div className="dash-coop-inspector-value mono">{activeNode.value}</div>
          <div className="dash-coop-inspector-status">
            {activeNode.status === 'warn' && <IcAlert size={13} />}
            <span>{statusLabel[activeNode.status]}</span>
          </div>
          {!showList && <p>{activeNode.note}</p>}

          <div className="dash-coop-inspector-tools">
            <button
              type="button"
              className={`dash-coop-inspector-toggle${showList ? ' open' : ''}`}
              onClick={() => setShowList((s) => !s)}
            >
              <IcChevronDown size={13} />
              {showList ? 'Ocultar' : `Ver ${activeInstances.length}`}
            </button>
            <button
              type="button"
              className="dash-coop-inspector-add"
              onClick={handleAddInstance}
            >
              <IcPlus size={12} />
              Agregar {KIND_SINGULAR[activeNode.kind]}
            </button>
          </div>

          {showList && (
            <ul className="dash-coop-instance-list">
              {activeInstances.map((inst, i) => (
                <li key={`${activeNode.id}-${i}`} className={`dash-coop-instance status-${inst.status}`}>
                  <div className="dash-coop-instance-info">
                    <span className="dash-coop-instance-zone">{inst.zone}</span>
                    <span className="dash-coop-instance-label">{inst.label}</span>
                  </div>
                  <strong className="mono dash-coop-instance-value">{inst.value}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="dash-coop-inspector-actions">
            <button type="button"><IcSettings size={13} /> Configurar</button>
            <button type="button"><IcRefresh size={13} /> Actualizar</button>
          </div>
        </aside>
      </div>

      <div className="dash-coop-device-strip">
        {DEVICE_NODES.map((node) => (
          <button
            key={node.id}
            type="button"
            className={`dash-coop-chip status-${node.status}${activeNode.id === node.id ? ' active' : ''}`}
            onClick={() => selectNode(node.id)}
          >
            <div className="dash-coop-chip-icon">{getDeviceIcon(node.kind, 14)}</div>
            <div className="dash-coop-chip-text">
              <div className="dash-coop-chip-label">{node.label}</div>
              <div className="mono dash-coop-chip-value">{node.value}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

const LotStat = ({
  label, value, tone = 'default',
}: {
  label: string
  value: ReactNode
  tone?: 'default' | 'warn'
}) => (
  <div className={`dash-coop-lot-stat tone-${tone}`}>
    <span>{label}</span>
    <strong className="mono">{value}</strong>
  </div>
)

export default CoopPlaceholder
