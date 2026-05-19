import { useEffect, useRef, useState } from 'react'
import { IcSparkle, IcSend, IcRefresh } from '../icons/icons'
import { panelIconBtn } from './shared'

type AiMetric = { label: string; value: string; unit: string; delta?: string; deltaPositive?: boolean }

type AiMsg = {
  from: 'ai' | 'me'
  text: string
  time: string
  suggestions?: string[]
  chart?: 'temp'
  metric?: AiMetric[]
}

const aiSuggestions = [
  { icon: '📊', label: 'Resumen del día',    prompt: '¿Cómo va el galpón 1 hoy?' },
  { icon: '🌡️', label: 'Analizar alertas',   prompt: 'Explícame la alerta de temperatura en zona 2' },
  { icon: '🐔', label: 'Predicción de peso', prompt: 'Proyecta el peso promedio en 7 días' },
  { icon: '📋', label: 'Reporte semanal',    prompt: 'Genera el reporte semanal del lote' },
]

const initialAiMsgs: AiMsg[] = [
  {
    from: 'ai',
    text: '¡Hola Juan! Soy Lía, tu asistente. Detecté **2 alertas activas** hoy. ¿Quieres revisarlas o prefieres ver el resumen del lote?',
    time: '08:30',
    suggestions: ['Revisar alertas', 'Ver resumen', 'Otra cosa'],
  },
]

function formatAi(text: string) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:600">$1</strong>')
    .replace(
      /`(.+?)`/g,
      '<code style="background:rgba(52,211,153,0.16);color:#34d399;padding:1px 5px;border-radius:4px;font-size:11.5px;font-family:DM Mono,monospace">$1</code>',
    )
}

function generateReply(prompt: string): AiMsg {
  const p = prompt.toLowerCase()
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (p.includes('alerta') || p.includes('zona 2') || p.includes('explícame')) {
    return {
      from: 'ai',
      time,
      text: 'La **zona 2** lleva 47 minutos con temperatura sobre el rango. Probable causa: extractor 3 al 50% por bloqueo de aire. Te recomiendo subirlo a 80% o pasar a **modo manual**.',
      chart: 'temp',
      suggestions: ['Subir extractor 3', 'Avisar a Carlos', 'Más detalles'],
    }
  }
  if (p.includes('resumen') || p.includes('cómo va') || p.includes('hoy')) {
    return {
      from: 'ai',
      time,
      text: 'Resumen del **Galpón 1** · hoy:',
      metric: [
        { label: 'Pollos vivos', value: '18,560', unit: '',   delta: '−12 vs ayer', deltaPositive: false },
        { label: 'Peso prom.',   value: '1.42',   unit: 'kg', delta: '+45 g',       deltaPositive: true  },
        { label: 'Alimento',     value: '245',    unit: 'kg', delta: 'meta 240',    deltaPositive: true  },
        { label: 'Agua',         value: '1,125',  unit: 'L',  delta: 'normal',      deltaPositive: true  },
      ],
      suggestions: ['Ver gráficas', 'Generar reporte', 'Comparar lotes'],
    }
  }
  if (p.includes('peso') || p.includes('predicción') || p.includes('proyect')) {
    return {
      from: 'ai',
      time,
      text: 'Proyección a **7 días**: peso promedio estimado `1.78 kg` (±3%). Sigues por encima de la curva Ross 308 esperada. Mantén el consumo de alimento actual.',
      suggestions: ['Ver curva', 'Comparar con Galpón 2'],
    }
  }
  if (p.includes('reporte')) {
    return {
      from: 'ai',
      time,
      text: 'Listo, preparé el **reporte semanal** del lote con consumo, peso y mortalidad. ¿Lo envío al equipo o lo descargas como PDF?',
      suggestions: ['Enviar al equipo', 'Descargar PDF'],
    }
  }
  if (p.includes('subir extractor') || p.includes('manual')) {
    return {
      from: 'ai',
      time,
      text: 'Hecho. Subí el extractor 3 al 80% y dejé la zona 2 en `modo manual` por 2 horas. Te aviso si vuelve a subir.',
      suggestions: ['Avisar a Carlos', 'Ver gráfica'],
    }
  }
  return {
    from: 'ai',
    time,
    text: 'Buena pregunta. Puedo ayudarte con monitoreo, alertas, proyecciones y reportes. ¿Sobre qué tema quieres profundizar?',
    suggestions: ['Alertas', 'Producción', 'Salud del lote'],
  }
}

const AiBubble = ({ msg, onSuggest }: { msg: AiMsg; onSuggest: (s: string) => void }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
    <div style={{
      width: 26,
      height: 26,
      borderRadius: 8,
      background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      color: '#0a1612',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <IcSparkle size={13} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--panel-line)',
          padding: '10px 13px',
          borderRadius: 14,
          borderTopLeftRadius: 4,
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--panel-text)',
        }}
        dangerouslySetInnerHTML={{ __html: formatAi(msg.text) }}
      />
      {msg.chart && <AiChart kind={msg.chart} />}
      {msg.metric && <AiMetricGrid data={msg.metric} />}
      {msg.suggestions && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {msg.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggest(s)}
              style={{
                background: 'transparent',
                border: '1px solid var(--panel-line)',
                color: 'var(--panel-accent)',
                fontSize: 11.5,
                fontWeight: 500,
                padding: '5px 11px',
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ fontSize: 9.5, color: 'var(--panel-text-2)', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
        Lía · {msg.time}
      </div>
    </div>
  </div>
)

const AiMetricGrid = ({ data }: { data: AiMetric[] }) => (
  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
    {data.map((m, i) => (
      <div
        key={i}
        style={{
          background: 'rgba(52, 211, 153, 0.06)',
          border: '1px solid rgba(52, 211, 153, 0.16)',
          borderRadius: 10,
          padding: '10px 12px',
        }}
      >
        <div style={{ fontSize: 10.5, color: 'var(--panel-text-2)' }}>{m.label}</div>
        <div style={{ fontSize: 17, color: '#fff', fontWeight: 500, marginTop: 2, fontFamily: 'DM Mono, monospace' }}>
          {m.value}
          <span style={{ fontSize: 10, color: 'var(--panel-text-2)', marginLeft: 3 }}>{m.unit}</span>
        </div>
        {m.delta && (
          <div style={{ fontSize: 10, color: m.deltaPositive ? '#34d399' : '#ef4444', marginTop: 2 }}>{m.delta}</div>
        )}
      </div>
    ))}
  </div>
)

const AiChart = ({ kind }: { kind: 'temp' }) => {
  if (kind === 'temp') {
    return (
      <div style={{
        marginTop: 8,
        padding: 10,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--panel-line)',
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 10.5, color: 'var(--panel-text-2)', marginBottom: 4 }}>Temperatura · últimas 24h</div>
        <svg width="100%" height="56" viewBox="0 0 280 56" preserveAspectRatio="none">
          <path d="M0 40 C 30 38, 50 28, 80 24 S 130 20, 160 28 S 220 36, 280 30" fill="none" stroke="#34d399" strokeWidth="1.6" />
          <path
            d="M0 40 C 30 38, 50 28, 80 24 S 130 20, 160 28 S 220 36, 280 30 L 280 56 L 0 56 Z"
            fill="rgba(52, 211, 153, 0.18)"
          />
        </svg>
      </div>
    )
  }
  return null
}

const TypingDots = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
    <div style={{
      width: 26,
      height: 26,
      borderRadius: 8,
      background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      color: '#0a1612',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <IcSparkle size={13} />
    </div>
    <div style={{
      background: 'var(--panel-2)',
      border: '1px solid var(--panel-line)',
      padding: '12px 14px',
      borderRadius: 14,
      borderTopLeftRadius: 4,
      display: 'flex',
      gap: 4,
    }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: 'var(--panel-accent)',
            animation: `typingDot 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
)

const ChatAi = () => {
  const [msgs, setMsgs] = useState<AiMsg[]>(initialAiMsgs)
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [msgs, thinking])

  const send = (text?: string) => {
    const value = (text ?? draft).trim()
    if (!value) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMsgs((m) => [...m, { from: 'me', text: value, time }])
    setDraft('')
    setThinking(true)
    setTimeout(() => {
      const reply = generateReply(value)
      setMsgs((m) => [...m, reply])
      setThinking(false)
    }, 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(52,211,153,0.18) 0%, rgba(52,211,153,0.04) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.22)',
          borderRadius: 14,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a1612',
          }}>
            <IcSparkle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              Lía{' '}
              <span style={{
                fontSize: 9.5,
                padding: '2px 6px',
                borderRadius: 999,
                background: 'rgba(52,211,153,0.18)',
                color: 'var(--panel-accent)',
                fontWeight: 500,
              }}>
                IA
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--panel-text-2)', marginTop: 1 }}>
              Asistente del galpón · Siempre disponible
            </div>
          </div>
          <button style={panelIconBtn()}><IcRefresh size={13} /></button>
        </div>
      </div>

      <div
        ref={listRef}
        className="panel-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '4px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {msgs.map((m, i) =>
          m.from === 'ai' ? (
            <AiBubble key={i} msg={m} onSuggest={send} />
          ) : (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: '78%' }}>
                <div style={{
                  background: 'var(--panel-accent)',
                  color: '#0a1612',
                  padding: '9px 13px',
                  borderRadius: 14,
                  borderBottomRightRadius: 4,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--panel-text-2)', marginTop: 3, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>
                  {m.time}
                </div>
              </div>
            </div>
          ),
        )}
        {thinking && <TypingDots />}
      </div>

      {msgs.length <= 2 && (
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{
            fontSize: 11,
            color: 'var(--panel-text-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}>
            Sugerencias
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s.prompt)}
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--panel-line)',
                  borderRadius: 11,
                  padding: '10px 12px',
                  color: 'var(--panel-text)',
                  fontSize: 12,
                  fontWeight: 500,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  lineHeight: 1.3,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '6px 16px 18px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--panel-2)',
          border: '1px solid var(--panel-line)',
          borderRadius: 14,
          padding: 6,
        }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'rgba(52, 211, 153, 0.14)',
            color: 'var(--panel-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 2,
          }}>
            <IcSparkle size={14} />
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            placeholder="Pregúntale a Lía…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              color: '#fff',
              fontSize: 13,
              padding: '4px 4px',
            }}
          />
          <button
            onClick={() => send()}
            style={{
              background: draft.trim() ? 'var(--panel-accent)' : 'rgba(255, 255, 255, 0.08)',
              color: draft.trim() ? '#0a1612' : 'rgba(255, 255, 255, 0.4)',
              border: 0,
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IcSend size={15} />
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--panel-text-2)', textAlign: 'center', marginTop: 8 }}>
          Las respuestas se generan con datos del galpón en tiempo real.
        </div>
      </div>
    </div>
  )
}

export default ChatAi
