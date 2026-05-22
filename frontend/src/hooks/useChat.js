import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

export function useChat() {
  const ws = useRef(null)
  const userId = useStore((s) => s.userId)
  const addMessage = useStore((s) => s.addMessage)
  const setConnected = useStore((s) => s.setConnected)

  const connect = useCallback(() => {
    if (!userId || ws.current?.readyState === WebSocket.OPEN) return
    ws.current = new WebSocket(`ws://localhost:8000/ws/chat/${userId}`)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => setConnected(false)
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data)
      addMessage({ role: 'assistant', content: data.text, ts: Date.now() })
    }
  }, [userId, addMessage, setConnected])

  const send = useCallback((text) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return
    addMessage({ role: 'user', content: text, ts: Date.now() })
    ws.current.send(JSON.stringify({ text }))
  }, [addMessage])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return { send }
}
