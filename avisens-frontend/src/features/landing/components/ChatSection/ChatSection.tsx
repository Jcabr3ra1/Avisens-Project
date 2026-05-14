import { useState, useEffect, useRef } from 'react'
import { useFadeUp } from '@shared/hooks/useFadeUp'
import Ic from '@shared/ui/Ic/Ic'
import './ChatSection.css'

const quickQuestions = [
  '¿Cómo está el galpón 4?',
  '¿Mi FCR es bueno?',
  '¿Cuándo debo vacunar?',
]

interface ChatMsg {
  r: 'bot' | 'user'
  t: string
  ts: string
}

const initialMsgs: ChatMsg[] = [
  {
    r: 'bot',
    t: '¡Hola! Soy AVIA 👋 Soy el asistente IA de AVISENS. Tengo acceso a todos los datos de tu granja en tiempo real. ¿En qué te ayudo?',
    ts: 'Ahora',
  },
]

function ChatSection() {
  const ref = useFadeUp()
  const [msgs, setMsgs] = useState<ChatMsg[]>(initialMsgs)
  const [inp, setInp] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs])

  const send = async () => {
    const text = inp.trim()
    if (!text || loading) return
    setInp('')
    const ts = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    setMsgs((m) => [...m, { r: 'user', t: text, ts }])
    setLoading(true)
    try {
      const reply = await (window as unknown as Record<string, { complete: (o: unknown) => Promise<string> }>).claude.complete({
        messages: [
          {
            role: 'user',
            content: `Eres AVIA, el asistente IA de AVISENS, una plataforma de gestión avícola inteligente para granjas en Colombia. Responde de forma concisa (2-3 oraciones), amigable y en español. Datos de la granja demo: Galpón 1 (94/100, temp 22°C, 15,000 aves), Galpón 2 (71/100, temp 26°C, 14,500 aves), Galpón 3 (97/100, temp 20°C, 15,200 aves), Galpón 4 (48/100 CRÍTICO, temp 28°C, 14,800 aves). FCR: 1.64. ROI estimado: $12,400 USD. Pregunta: ${text}`,
          },
        ],
      })
      setMsgs((m) => [
        ...m,
        {
          r: 'bot',
          t: reply,
          ts: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch {
      setMsgs((m) => [
        ...m,
        {
          r: 'bot',
          t: 'Ups, algo falló. Intenta de nuevo.',
          ts: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }
    setLoading(false)
  }

  return (
    <section id="chatbot" style={{ background: 'var(--bg3)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className="chat-inner fade-up" ref={ref}>
        <div>
          <div className="section-label">Asistente IA</div>
          <h2 className="section-title">
            Pregúntale a <span className="grad-text">AVIA</span>.
            <br />
            Respuestas reales.
          </h2>
          <p className="section-sub">
            AVIA tiene acceso a todos los datos de tu granja en tiempo real. Hazle preguntas en lenguaje natural — no necesitas saber usar dashboards.
          </p>
          <div style={{ marginTop: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              {
                q: '"¿Cómo está el galpón 4?"',
                a: 'AVIA revisa los sensores y te explica qué variable está fuera de rango y por qué.',
              },
              {
                q: '"¿Cuánto alimento necesito esta semana?"',
                a: 'Calcula según el ciclo, FCR actual e inventario disponible en tiempo real.',
              },
              {
                q: '"¿Por qué bajó el Health Score?"',
                a: 'Analiza el historial de 24h y da una explicación clara sin tecnicismos.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="chat-example">
                <div className="chat-example-q">{q}</div>
                <div className="chat-example-a">{a}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="chat-window">
          <div className="chat-topbar">
            <div className="chat-avatar">
              <Ic d={['M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18']} size={16} style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <div className="chat-name">AVIA — Asistente AVISENS</div>
              <div className="chat-online">IA activa · En línea</div>
            </div>
          </div>
          <div className="chat-msgs" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.r}`}>
                <div className="msg-bub">{m.t}</div>
                <div className="msg-time">{m.ts}</div>
              </div>
            ))}
            {loading && (
              <div className="msg bot">
                <div className="msg-bub">
                  <div className="dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="quick-bar">
            {quickQuestions.map((q) => (
              <button key={q} className="quick-btn" onClick={() => setInp(q)}>
                {q}
              </button>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-inp"
              placeholder="Pregúntale a AVIA en español..."
              value={inp}
              onChange={(e) => setInp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="chat-send-btn" onClick={send} aria-label="Enviar">
              <Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={16} style={{ color: '#001a0a' }} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ChatSection
