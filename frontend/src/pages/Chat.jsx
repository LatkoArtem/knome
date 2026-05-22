import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useStore } from '../store'
import { useChat } from '../hooks/useChat'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[80%] md:max-w-[68%] ${isUser ? '' : 'flex-1'}`}>
        {msg.trigger_type && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs text-zinc-500 font-medium">
              {msg.trigger_type === 'morning_checkin' ? '☀️ Ранкове нагадування' :
               msg.trigger_type === 'weekly_report'   ? '📊 Тижневий звіт' : '💡 Knome'}
            </span>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md ml-auto'
              : msg.trigger_type
                ? 'bg-zinc-800/50 border border-blue-500/20 text-zinc-200 rounded-bl-md'
                : 'bg-zinc-900 border border-white/[0.06] text-zinc-200 rounded-bl-md'
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          ) : (
            <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none
                [&>p]:mb-2 [&>p:last-child]:mb-0
                [&>ul]:mb-2 [&>ul]:pl-4 [&>li]:mb-0.5
                [&>ol]:mb-2 [&>ol]:pl-4
                [&>strong]:font-semibold [&>strong]:text-zinc-100
                [&>code]:bg-zinc-800 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-blue-300 [&>code]:text-xs
                [&>pre]:bg-zinc-800 [&>pre]:rounded-lg [&>pre]:p-3 [&>pre]:mb-2 [&>pre]:overflow-x-auto
                [&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-1
                [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mb-1
                [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mb-1"
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
        <div className={`mt-1 text-[10px] text-zinc-600 ${isUser ? 'text-right' : 'text-left'}`}>
          {msg.ts ? new Date(msg.ts).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-zinc-300">
          Я
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce3" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Привіт! Я Knome</h2>
        <p className="text-sm text-zinc-500 max-w-xs">Твій персональний AI-агент для навчання, фінансів і здоров'я</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[
          { icon: '📚', text: 'Позаймався Python 30 хвилин' },
          { icon: '💰', text: 'Витратив 250 грн на продукти' },
          { icon: '❤️', text: 'Спав 7 годин, настрій 8/10' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.06] text-sm text-zinc-400 text-left hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-default">
            <span>{icon}</span>
            <span className="italic">«{text}»</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Chat() {
  const [input, setInput] = useState('')
  const messages = useStore((s) => s.messages)
  const streamingContent = useStore((s) => s.streamingContent)
  const isLoading = useStore((s) => s.isLoading)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const { send } = useChat()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSend = () => {
    if (!input.trim()) return
    send(input.trim())
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100">Чат</span>
          <span className="hidden sm:block text-xs text-zinc-600">· Knome AI</span>
        </div>
        <button
          onClick={() => setLanguage(language === 'ua' ? 'en' : 'ua')}
          className="btn-ghost text-xs px-2.5 py-1.5"
        >
          {language === 'ua' ? '🇬🇧 EN' : '🇺🇦 UA'}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !streamingContent && !isLoading && <EmptyState />}

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {streamingContent && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap max-w-[80%] md:max-w-[68%]">
                {streamingContent}
                <span className="inline-block w-0.5 h-3.5 bg-blue-400 ml-0.5 align-text-bottom animate-blink" />
              </div>
            </div>
          )}

          {isLoading && !streamingContent && <TypingDots />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#09090B]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 focus-within:border-zinc-700 transition-colors">
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none py-1.5 max-h-32"
              placeholder="Напиши повідомлення..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors mb-0.5"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-700 mt-2">Enter — надіслати · Shift+Enter — новий рядок</p>
        </div>
      </div>
    </div>
  )
}
