import { useEffect, useRef, useState } from 'react'
import { IcMic, IcMicOff, IcSparkle, IcStop, IcSettings } from '@shared/ui/icons/icons'
import { panelIconBtn } from './shared'

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

type Line = { from: 'me' | 'lia'; text: string; live?: boolean }

const voiceScripts = [
  {
    you: '¿Cómo está la temperatura del Galpón 1?',
    lia: 'La temperatura del Galpón 1 está en 27.4 grados. Dentro del rango óptimo para pollos de engorde de 32 días. La zona 2 está marcando 30.1, te recomiendo revisar.',
  },
  {
    you: 'Sube la ventilación al setenta por ciento.',
    lia: 'Listo. Ventilación del Galpón 1 ajustada al 70 por ciento en modo manual. ¿Quieres que la mantenga así por cuánto tiempo?',
  },
  {
    you: '¿Cuántos pollos quedan en el lote?',
    lia: 'En el Galpón 1 quedan 18,560 pollos vivos. La mortalidad acumulada del lote es de 2.1 por ciento, dentro del rango esperado.',
  },
  {
    you: 'Avísame si la temperatura supera los treinta y un grados.',
    lia: 'Perfecto. Configuré una alerta cuando la temperatura supere los 31 grados. Te llamaré por voz o notificación, ¿cuál prefieres?',
  },
]

const VoiceOrb = ({ state }: { state: VoiceState }) => {
  const ringCount = 4
  return (
    <div style={{
      width: 180,
      height: 180,
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {Array.from({ length: ringCount }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px solid rgba(52, 211, 153, 0.22)',
            animation: state !== 'idle' ? `orbRing 2.2s ease-out ${i * 0.55}s infinite` : 'none',
          }}
        />
      ))}
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #a7f3d0 0%, #10b981 50%, #047857 100%)',
        boxShadow:
          state !== 'idle'
            ? '0 0 80px rgba(52, 211, 153, 0.5), inset 0 -8px 24px rgba(0, 0, 0, 0.25)'
            : '0 0 40px rgba(52, 211, 153, 0.28), inset 0 -8px 24px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        overflow: 'hidden',
        animation: state === 'speaking' ? 'orbBreatheSpeaking 1.4s ease-in-out infinite' : 'orbBreathe 4s ease-in-out infinite',
      }}>
        <svg viewBox="0 0 120 120" width="120" height="120" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="orbGlow">
              <stop offset="0%" stopColor="rgba(220, 255, 235, 0.6)" />
              <stop offset="100%" stopColor="rgba(220, 255, 235, 0)" />
            </radialGradient>
          </defs>
          <circle cx="40" cy="42" r="22" fill="url(#orbGlow)" />
          <g transform="translate(60 60)">
            {Array.from({ length: 9 }).map((_, i) => {
              const x = (i - 4) * 8
              return (
                <rect
                  key={i}
                  x={x - 1.5}
                  y={-3}
                  width="3"
                  height="6"
                  rx="1.5"
                  fill="rgba(255, 255, 255, 0.7)"
                  style={{
                    animation: state !== 'idle' ? `vbar2 ${0.6 + (i % 3) * 0.2}s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
                    transformOrigin: `${x}px 0px`,
                  }}
                />
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}

const VoiceLine = ({ from, text, live }: { from: 'me' | 'lia'; text: string; live?: boolean }) => {
  const isMe = from === 'me'
  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
      <div style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        flexShrink: 0,
        background: isMe ? '#1c2c25' : 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
        color: isMe ? '#34d399' : '#0a1612',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
      }}>
        {isMe ? 'JM' : <IcSparkle size={12} />}
      </div>
      <div style={{
        background: isMe ? 'rgba(52, 211, 153, 0.08)' : 'var(--panel-2)',
        border: '1px solid var(--panel-line)',
        padding: '8px 12px',
        borderRadius: 12,
        fontSize: 12.5,
        lineHeight: 1.5,
        color: 'var(--panel-text)',
        maxWidth: '80%',
        fontStyle: isMe ? 'italic' : 'normal',
      }}>
        {text}
        {live && (
          <span style={{
            display: 'inline-block',
            width: 6,
            height: 12,
            background: 'var(--panel-accent)',
            verticalAlign: 'middle',
            marginLeft: 2,
            animation: 'blink 0.8s steps(2) infinite',
          }} />
        )}
      </div>
    </div>
  )
}

const ChatVoice = () => {
  const [state, setState] = useState<VoiceState>('idle')
  const [scriptIdx, setScriptIdx] = useState(0)
  const [transcript, setTranscript] = useState<Line[]>([
    { from: 'lia', text: 'Hola Juan, soy Lía, tu asistente AVISENS. Mantén pulsado el botón o di "Oye AVISENS" para empezar.' },
  ])
  const [muted, setMuted] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [transcript, state])

  const startListen = () => {
    if (state !== 'idle') return
    setState('listening')
    const s = voiceScripts[scriptIdx % voiceScripts.length]
    setTranscript((t) => [...t, { from: 'me', text: '', live: true }])
    let i = 0
    const typer = setInterval(() => {
      i++
      setTranscript((t) => {
        const copy = [...t]
        copy[copy.length - 1] = { from: 'me', text: s.you.slice(0, i), live: i < s.you.length }
        return copy
      })
      if (i >= s.you.length) {
        clearInterval(typer)
        setTimeout(() => {
          setState('thinking')
          setTimeout(() => {
            setState('speaking')
            setTranscript((t) => [...t, { from: 'lia', text: s.lia }])
            setTimeout(() => {
              setState('idle')
              setScriptIdx((x) => x + 1)
            }, 2800)
          }, 900)
        }, 400)
      }
    }, 40)
  }

  const lastLine = transcript[transcript.length - 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '20px 20px 12px', textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 11, color: 'var(--panel-text-2)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>
          Asistente de voz
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 16 }}>
          {state === 'idle' && 'Lía está lista'}
          {state === 'listening' && 'Escuchando…'}
          {state === 'thinking' && 'Pensando…'}
          {state === 'speaking' && 'Lía está hablando'}
        </div>
        <VoiceOrb state={state} />
      </div>

      <div style={{ padding: '6px 20px 0', textAlign: 'center', minHeight: 36 }}>
        {state === 'listening' && (
          <div style={{ fontSize: 13.5, color: '#fff', fontStyle: 'italic' }}>
            "{(lastLine && lastLine.text) || '…'}"
          </div>
        )}
        {state === 'idle' && (
          <div style={{ fontSize: 12, color: 'var(--panel-text-2)' }}>
            Mantén presionado para hablar · o di "Oye AVISENS"
          </div>
        )}
        {state === 'thinking' && (
          <div style={{ display: 'inline-flex', gap: 5 }}>
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
        )}
      </div>

      <div
        ref={transcriptRef}
        className="panel-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{
          fontSize: 10.5,
          color: 'var(--panel-text-2)',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 4,
        }}>
          Transcripción
        </div>
        {transcript.map((t, i) => (
          <VoiceLine key={i} from={t.from} text={t.text} live={t.live} />
        ))}
      </div>

      <div style={{ padding: '12px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={() => setMuted((m) => !m)}
            style={{ ...panelIconBtn(), width: 44, height: 44, borderRadius: 14 }}
            title={muted ? 'Activar micrófono' : 'Silenciar'}
          >
            {muted ? <IcMicOff size={18} /> : <IcMic size={18} />}
          </button>

          <button
            onMouseDown={startListen}
            onTouchStart={startListen}
            disabled={state !== 'idle'}
            style={{
              flex: 1,
              height: 60,
              borderRadius: 18,
              border: 0,
              background:
                state === 'idle'
                  ? 'linear-gradient(180deg, #34d399 0%, #10b981 100%)'
                  : 'linear-gradient(180deg, #1c2c25 0%, #14211b 100%)',
              color: state === 'idle' ? '#0a1612' : 'var(--panel-text)',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: state === 'idle' ? '0 6px 18px rgba(16, 185, 129, 0.36)' : 'none',
              cursor: state === 'idle' ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {state === 'idle' && (
              <>
                <IcMic size={18} /> Hablar con Lía
              </>
            )}
            {state === 'listening' && (
              <>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 3,
                        height: 14,
                        borderRadius: 2,
                        background: '#34d399',
                        animation: `vbar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                      }}
                    />
                  ))}
                </span>{' '}
                Escuchando
              </>
            )}
            {state === 'thinking' && 'Procesando…'}
            {state === 'speaking' && (
              <>
                <IcStop size={16} /> Tocar para interrumpir
              </>
            )}
          </button>

          <button style={{ ...panelIconBtn(), width: 44, height: 44, borderRadius: 14 }} title="Configuración">
            <IcSettings size={18} />
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{
            fontSize: 10.5,
            color: 'var(--panel-text-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}>
            Comandos sugeridos
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              '"¿Cómo va el lote?"',
              '"Registra peso de hoy"',
              '"Sube la ventilación"',
              '"Léeme las alertas"',
              '"Llama a Carlos"',
            ].map((cmd, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: 'var(--panel-text-2)',
                  padding: '5px 10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--panel-line)',
                  borderRadius: 999,
                }}
              >
                {cmd}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatVoice
