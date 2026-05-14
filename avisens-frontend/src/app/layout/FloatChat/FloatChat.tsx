import { useState, useEffect, useRef } from 'react'
import Ic from '@shared/ui/Ic/Ic'
import './FloatChat.css'

function FloatChat() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{ r: 'bot' | 'user'; t: string }[]>([
    { r: 'bot', t: '¡Hola! Soy AVIA 👋 ¿Tienes preguntas sobre AVISENS o quieres ver una demostración?' },
  ])
  const [inp, setInp] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs, open])

  const send = async () => {
    const text = inp.trim()
    if (!text || loading) return
    setInp('')
    setMsgs((m) => [...m, { r: 'user', t: text }])
    setLoading(true)
    try {
      const reply = await (window as unknown as Record<string, { complete: (o: unknown) => Promise<string> }>).claude.complete({
        messages: [
          {
            role: 'user',
            content: `Eres AVIA, asistente de ventas de AVISENS, plataforma avícola SaaS para LATAM. Responde conciso (2-3 oraciones), amigable, en español. Precios: Starter $29/mes, Professional $79/mes, Enterprise $199/mes. Pregunta: ${text}`,
          },
        ],
      })
      setMsgs((m) => [...m, { r: 'bot', t: reply }])
    } catch {
      setMsgs((m) => [...m, { r: 'bot', t: 'Ups, algo falló. Escríbenos a contacto@avisens.com' }])
    }
    setLoading(false)
  }

  return (
    <div className="float-chat">
      <div className={`float-panel ${open ? '' : 'hidden'}`}>
        <div className="chat-topbar">
          <div className="chat-avatar">
            <Ic d={['M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18']} size={16} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="chat-name">AVIA</div>
            <div className="chat-online">Asistente AVISENS</div>
          </div>
          <button onClick={() => setOpen(false)} className="chat-close" aria-label="Cerrar">
            <Ic d="M18 6L6 18M6 6l12 12" size={16} />
          </button>
        </div>
        <div className="chat-msgs" ref={scrollRef} style={{ minHeight: 180, maxHeight: 220 }}>
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.r}`}>
              <div className="msg-bub">{m.t}</div>
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
        <div className="chat-input-row">
          <input
            className="chat-inp"
            placeholder="Escribe tu pregunta..."
            value={inp}
            onChange={(e) => setInp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="chat-send-btn" onClick={send} aria-label="Enviar">
            <Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={16} style={{ color: '#fff' }} />
          </button>
        </div>
      </div>
      <button className="float-btn" onClick={() => setOpen(!open)} aria-label="Abrir chat">
        <Ic d={open ? 'M18 6L6 18M6 6l12 12' : 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'} size={22} style={{ color: '#fff' }} />
      </button>
    </div>
  )
}

export default FloatChat
