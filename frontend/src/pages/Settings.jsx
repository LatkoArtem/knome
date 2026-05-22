import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

export default function Settings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userId = useStore((s) => s.userId)
  const userName = useStore((s) => s.userName)
  const userEmail = useStore((s) => s.userEmail)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const logout = useStore((s) => s.logout)

  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API}/user/export/${userId}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `knome_export_${userId.slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`${API}/user/delete/${userId}`, { method: 'DELETE' })
      logout()
      navigate('/login')
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">⚙️ Налаштування</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Profile */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Профіль</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg">
              {(userName || userEmail || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userName || 'Гість'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail || userId?.slice(0, 8)}</p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Вигляд</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Тема</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? '☀️ Світла' : '🌙 Темна'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Мова</span>
            <button
              onClick={() => setLanguage(language === 'ua' ? 'en' : 'ua')}
              className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {language === 'ua' ? '🇺🇦 UA' : '🇬🇧 EN'}
            </button>
          </div>
        </section>

        {/* Data */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Дані</h2>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-left px-4"
          >
            {exporting ? '⏳ Завантаження...' : '📥 Завантажити мої дані (JSON)'}
          </button>
        </section>

        {/* Logout */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Акаунт</h2>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-left px-4"
          >
            🚪 Вийти
          </button>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-rose-200 dark:border-rose-900 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Небезпечна зона</h2>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-left px-4"
            >
              🗑️ Видалити акаунт і всі дані
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-rose-600 dark:text-rose-400">Всі дані будуть видалені назавжди. Це незворотньо.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {deleting ? 'Видалення...' : 'Підтвердити видалення'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm"
                >
                  Скасувати
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
