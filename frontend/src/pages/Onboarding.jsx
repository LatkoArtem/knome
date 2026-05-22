import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

function generateUserId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function Onboarding() {
  const navigate = useNavigate()
  const setUserId = useStore((s) => s.setUserId)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [done, setDone] = useState(false)
  const [streaming, setStreaming] = useState('')

  const ws = useRef(null)
  const userIdRef = useRef(generateUserId())
  const bottomRef = useRef(null)
  const streamingRef = useRef('')
  const inputRef = useRef(null)

  useEffect(() => {
    const uid = userIdRef.current
    const socket = new WebSocket(`ws://localhost:8000/ws/chat/${uid}`)
    ws.current = socket
    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.token !== undefined) {
        streamingRef.current += data.token
        setStreaming(streamingRef.current)
      } else if (data.done) {
        if (streamingRef.current) {
          setMessages(prev => [...prev, { role: 'assistant', content: streamingRef.current }])
          streamingRef.current = ''; setStreaming('')
        }
        if (data.onboarding_complete) {
          setDone(true); setUserId(data.user_id)
          setTimeout(() => navigate('/chat'), 1800)
        }
      } else if (data.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
        if (data.onboarding_complete) {
          setDone(true); setUserId(data.user_id)
          setTimeout(() => navigate('/chat'), 1800)
        }
      }
    }
    return () => socket.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const handleSend = () => {
    if (!input.trim() || !connected || done) return
    const text = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: text }])
    ws.current?.send(JSON.stringify({ text }))
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[700px] h-[700px] rounded-full bg-blue-600/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg flex flex-col" style={{ height: 'min(600px, 90vh)' }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <span className="font-semibold text-zinc-200 tracking-tight">Knome · Знайомство</span>
          {!connected && <span className="ml-auto text-xs text-amber-500">З'єднання...</span>}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto card p-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-zinc-800/60 border border-white/[0.06] text-zinc-200 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {streaming && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div className="bg-zinc-800/60 border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap max-w-[80%]">
                {streaming}
                <span className="inline-block w-0.5 h-3.5 bg-blue-400 ml-0.5 align-text-bottom animate-blink" />
              </div>
            </div>
          )}

          {done && (
            <div className="flex justify-center py-2">
              <span className="text-xs text-zinc-500 bg-zinc-800/60 border border-white/[0.06] rounded-full px-3 py-1">
                ✓ Переходимо до чату...
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 focus-within:border-zinc-700 transition-colors">
            <input
              ref={inputRef}
              type="text"
              placeholder={connected ? 'Напиши відповідь...' : "З'єднання..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={!connected || done}
              autoFocus
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none py-1.5 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!connected || !input.trim() || done}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
