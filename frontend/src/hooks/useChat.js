import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

export function useChat() {
  const ws = useRef(null)
  const userId = useStore((s) => s.userId)
  const addMessage = useStore((s) => s.addMessage)
  const setConnected = useStore((s) => s.setConnected)
  const setLoading = useStore((s) => s.setLoading)
  const appendToStream = useStore((s) => s.appendToStream)
  const finalizeStream = useStore((s) => s.finalizeStream)

  const connect = useCallback(() => {
    if (!userId || ws.current?.readyState === WebSocket.OPEN) return
    ws.current = new WebSocket(`ws://localhost:8000/ws/chat/${userId}`)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => { setConnected(false); setLoading(false) }

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.token !== undefined) {
        // Streaming token
        appendToStream(data.token)
      } else if (data.done) {
        // End of stream — finalize message
        finalizeStream()
      } else if (data.text) {
        // Non-streaming message (proactive trigger or fallback)
        addMessage({ role: 'assistant', content: data.text, ts: Date.now(), trigger_type: data.trigger_type ?? null })
        setLoading(false)
      }
    }
  }, [userId, addMessage, setConnected, setLoading, appendToStream, finalizeStream])

  const send = useCallback((text) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return
    addMessage({ role: 'user', content: text, ts: Date.now() })
    setLoading(true)
    ws.current.send(JSON.stringify({ text }))
  }, [addMessage, setLoading])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return { send }
}
