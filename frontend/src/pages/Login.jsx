import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { Zap } from 'lucide-react'

const API = 'http://localhost:8000/api'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useStore((s) => s.setAuth)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
    const body = mode === 'login'
      ? { email: form.email, password: form.password }
      : { name: form.name, email: form.email, password: form.password }
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Помилка'); return }
      setAuth({ user_id: data.user_id, token: data.token, email: data.email, name: data.name })
      navigate('/chat')
    } catch { setError('Не вдалося підключитись до сервера') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/20">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Knome</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('login.subtitle')}</p>
        </div>

        <div className="card p-6">
          <div className="flex gap-1 bg-zinc-800/60 rounded-lg p-1 mb-5">
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                  mode === m ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {m === 'login' ? t('login.tab_login') : t('login.tab_register')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('login.name_label')}</label>
                <input {...field('name')} type="text" required placeholder={t('login.name_placeholder')} className="input" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('login.email_label')}</label>
              <input {...field('email')} type="email" required placeholder={t('login.email_placeholder')} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('login.password_label')}</label>
              <input {...field('password')} type="password" required
                placeholder={mode === 'register' ? t('login.password_placeholder_register') : t('login.password_placeholder_login')}
                className="input" />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1 py-2.5">
              {loading
                ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('login.btn_loading')}</span>
                : mode === 'login' ? t('login.btn_login') : t('login.btn_register')
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          <Link to="/onboarding" className="hover:text-zinc-400 transition-colors">{t('login.guest_link')}</Link>
        </p>
      </div>
    </div>
  )
}
