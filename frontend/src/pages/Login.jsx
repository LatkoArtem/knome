import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useStore((s) => s.setAuth)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
    const body = mode === 'login'
      ? { email: form.email, password: form.password }
      : { name: form.name, email: form.email, password: form.password }

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Помилка')
        return
      }

      setAuth({ user_id: data.user_id, token: data.token, email: data.email, name: data.name })
      navigate('/chat')
    } catch {
      setError('Не вдалося підключитись до сервера')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50 dark:bg-gray-950">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">Knome</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Особистий AI-агент</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Вхід
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Реєстрація
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ім'я</label>
                <input
                  type="text"
                  required
                  placeholder="Як тебе звати?"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Пароль</label>
              <input
                type="password"
                required
                placeholder={mode === 'register' ? 'Мінімум 6 символів' : '••••••'}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {loading ? '...' : mode === 'login' ? 'Увійти' : 'Зареєструватись'}
            </button>
          </form>
        </div>

        {/* Guest mode link */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          <Link to="/onboarding" className="hover:text-gray-600 dark:hover:text-gray-400 underline">
            Продовжити без реєстрації
          </Link>
        </p>
      </div>
    </div>
  )
}
