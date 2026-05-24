import { useState, useEffect, useRef, Fragment } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useChat } from '../hooks/useChat'
import { IllustrationChat } from '../components/Illustrations'

function isSameDay(ts1, ts2) {
  if (!ts1 || !ts2) return false
  return new Date(ts1).toDateString() === new Date(ts2).toDateString()
}

function formatDateLabel(ts, lang) {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())
    return lang === 'ua' ? 'Сьогодні' : 'Today'
  if (d.toDateString() === yesterday.toDateString())
    return lang === 'ua' ? 'Вчора' : 'Yesterday'
  return d.toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'en-GB', {
    day: 'numeric', month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

function DateSeparator({ ts, lang }) {
  return (
    <div className="flex items-center gap-3 my-1 select-none">
      <div className="flex-1 h-px bg-white/[0.04]" />
      <span className="text-[10px] text-zinc-600 font-medium px-2.5 py-0.5 rounded-full bg-zinc-900/60 border border-white/[0.05]">
        {formatDateLabel(ts, lang)}
      </span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  )
}

const MD_COMPONENTS = {
  p:      ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
  em:     ({ children }) => <em className="italic text-zinc-300">{children}</em>,
  ul:     ({ children }) => <ul className="mb-2 pl-4 space-y-0.5 list-disc marker:text-zinc-600">{children}</ul>,
  ol:     ({ children }) => <ol className="mb-2 pl-4 space-y-0.5 list-decimal marker:text-zinc-600">{children}</ol>,
  li:     ({ children }) => <li className="leading-relaxed">{children}</li>,
  code:   ({ children, inline }) => inline
    ? <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-blue-300 text-xs font-mono">{children}</code>
    : <code className="block bg-zinc-800 rounded-lg p-3 mb-2 text-xs font-mono overflow-x-auto text-zinc-200">{children}</code>,
  pre:    ({ children }) => <>{children}</>,
  h1:     ({ children }) => <h1 className="text-base font-bold mb-1 text-zinc-100">{children}</h1>,
  h2:     ({ children }) => <h2 className="text-sm font-semibold mb-1 text-zinc-100">{children}</h2>,
  h3:     ({ children }) => <h3 className="text-sm font-medium mb-1 text-zinc-200">{children}</h3>,
  a:      ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{children}</a>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-700 pl-3 text-zinc-400 italic mb-2">{children}</blockquote>,
}

const KnomeAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
    <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
    </svg>
  </div>
)

function Message({ msg }) {
  const { t } = useTranslation()
  const isUser = msg.role === 'user'
  const triggerLabel =
    msg.trigger_type === 'morning_checkin' ? t('chat.trigger_morning') :
    msg.trigger_type === 'weekly_report'   ? t('chat.trigger_weekly')  :
    msg.trigger_type                       ? t('chat.trigger_other')   : null

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <KnomeAvatar />}
      <div className={`max-w-[80%] md:max-w-[68%] ${isUser ? '' : 'flex-1'}`}>
        {triggerLabel && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs text-zinc-500 font-medium">{triggerLabel}</span>
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md ml-auto'
            : msg.trigger_type
              ? 'bg-zinc-800/50 border border-blue-500/20 text-zinc-200 rounded-bl-md'
              : 'bg-zinc-900 border border-white/[0.06] text-zinc-200 rounded-bl-md'
        }`}>
          {isUser
            ? <span className="whitespace-pre-wrap">{msg.content}</span>
            : <ReactMarkdown components={MD_COMPONENTS}>{msg.content}</ReactMarkdown>
          }
        </div>
        <div className={`mt-1 text-[10px] text-zinc-600 ${isUser ? 'text-right' : 'text-left'}`}>
          {msg.ts ? new Date(msg.ts).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-zinc-300">
          {useStore.getState().userName?.[0]?.toUpperCase() || 'Я'}
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <KnomeAvatar />
      <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce3" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onSuggestion }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const SUGGESTIONS = lang === 'en'
    ? [
        { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: '📚', text: 'Studied Python for 30 minutes' },
        { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: '💳', text: 'Spent $15 on groceries at Walmart' },
        { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: '🌙', text: 'Slept 7 hours, mood 8/10' },
      ]
    : [
        { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: '📚', text: 'Позаймався Python 30 хвилин' },
        { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: '💳', text: 'Витратив 250 грн на продукти в АТБ' },
        { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: '🌙', text: 'Спав 7 годин, настрій 8/10' },
      ]

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 px-4 py-16 text-center animate-fade-up">
      <IllustrationChat />
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">{t('chat.empty_title')}</h2>
        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">{t('chat.empty_sub')}</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-0.5">{t('chat.empty_try')}</p>
        {SUGGESTIONS.map(({ color, icon, text }) => (
          <button key={text} onClick={() => onSuggestion(text)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm text-left
              hover:scale-[1.02] hover:brightness-110 active:scale-[0.99]
              transition-all duration-150 ease-out-expo ${color}`}>
            <span className="text-base shrink-0">{icon}</span>
            <span className="italic opacity-80 leading-snug">«{text}»</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Chat() {
  const { t } = useTranslation()
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

  const handleSend = (text) => {
    const msg = (typeof text === 'string' ? text : input).trim()
    if (!msg) return
    send(msg)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100">{t('chat.title')}</span>
          <span className="hidden sm:block text-xs text-zinc-600">· {t('chat.subtitle')}</span>
        </div>
        <button onClick={() => setLanguage(language === 'ua' ? 'en' : 'ua')}
          className="btn-ghost text-xs px-2.5 py-1.5 gap-1">
          <Languages className="w-3.5 h-3.5" />
          {language === 'ua' ? 'EN' : 'UA'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !streamingContent && !isLoading && <EmptyState onSuggestion={handleSend} />}
          {messages.map((msg, i) => (
            <Fragment key={i}>
              {(i === 0 || !isSameDay(messages[i - 1].ts, msg.ts)) && msg.ts && (
                <DateSeparator ts={msg.ts} lang={language} />
              )}
              <Message msg={msg} />
            </Fragment>
          ))}

          {streamingContent && (
            <div className="flex gap-3 animate-fade-in">
              <KnomeAvatar />
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

      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#09090B]/95 backdrop-blur">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-zinc-900/80 border border-zinc-800
                          rounded-xl px-4 py-2
                          focus-within:border-blue-500/50 focus-within:shadow-glow-blue
                          transition-all duration-200">
            <textarea ref={inputRef} rows={1}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500
                         focus:outline-none resize-none py-1.5 max-h-32 leading-relaxed"
              placeholder={t('chat.placeholder')}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500
                         disabled:opacity-25 disabled:cursor-not-allowed
                         flex items-center justify-center
                         transition-all duration-150 active:scale-95 mb-0.5
                         shadow-[0_1px_4px_rgba(37,99,235,0.3)]"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-center text-2xs text-zinc-700 mt-1.5">{t('chat.hint')}</p>
        </div>
      </div>
    </div>
  )
}
