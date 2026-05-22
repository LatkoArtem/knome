import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useChat } from '../hooks/useChat'

export default function Chat() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const messages = useStore((s) => s.messages)
  const streamingContent = useStore((s) => s.streamingContent)
  const isLoading = useStore((s) => s.isLoading)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const { send } = useChat()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSend = () => {
    if (!input.trim()) return
    send(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <span className="font-semibold text-lg text-primary-600 dark:text-primary-400">Knome</span>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage(language === 'ua' ? 'en' : 'ua')}
            className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {language === 'ua' ? 'EN' : 'UA'}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[75%] px-4 py-3 rounded-2xl text-sm bg-gray-100 dark:bg-gray-800 rounded-bl-sm text-gray-700 dark:text-gray-300">
              Привіт! Я Knome 👋<br />
              Запитай мене про навчання, фінанси або здоров'я — або просто розкажи як день пройшов.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : msg.trigger_type
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-bl-sm text-gray-800 dark:text-gray-200'
                    : 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm text-gray-800 dark:text-gray-200'
              }`}
            >
              {msg.trigger_type && (
                <span className="block text-xs text-indigo-500 dark:text-indigo-400 mb-1 font-medium">
                  {msg.trigger_type === 'morning_checkin' ? '☀️ Нагадування' : msg.trigger_type === 'weekly_report' ? '📊 Тижневий звіт' : '💡 Knome'}
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[75%] px-4 py-2 rounded-2xl text-sm bg-gray-100 dark:bg-gray-800 rounded-bl-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              {streamingContent}
              <span className="inline-block w-0.5 h-3.5 bg-gray-500 dark:bg-gray-400 ml-0.5 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}

        {/* Loading dots (waiting for first token) */}
        {isLoading && !streamingContent && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex gap-2">
        <input
          className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          placeholder={t('chat.placeholder', 'Напиши повідомлення...')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium"
        >
          {t('chat.send', 'Надіслати')}
        </button>
      </div>
    </div>
  )
}
