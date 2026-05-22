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

  const ws = useRef(null)
  const userIdRef = useRef(generateUserId())
  const bottomRef = useRef(null)

  useEffect(() => {
    const uid = userIdRef.current
    const socket = new WebSocket(`ws://localhost:8000/ws/chat/${uid}`)
    ws.current = socket

    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.text }])
      }
      if (data.onboarding_complete) {
        setDone(true)
        setUserId(data.user_id)
        setTimeout(() => navigate('/chat'), 1800)
      }
    }

    return () => socket.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || !connected || done) return
    const text = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    ws.current?.send(JSON.stringify({ text }))
    setInput('')
  }

  return (
    <div className="flex flex-col h-screen">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span className="font-semibold text-lg text-primary-600 dark:text-primary-400">Knome</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">Знайомство</span>
          {!connected && (
            <span className="ml-auto text-xs text-yellow-500">З'єднання...</span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {done && (
            <div className="flex justify-center">
              <span className="text-xs text-gray-400 dark:text-gray-500">Переходимо до чату...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex gap-2">
          <input
            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50"
            placeholder={connected ? 'Напиши відповідь...' : "З'єднання..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={!connected || done}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!connected || !input.trim() || done}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Надіслати
          </button>
        </div>
    </div>
  )
}
