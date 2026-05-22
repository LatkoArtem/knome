import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

function Section({ title, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <p className="section-label">{title}</p>
      </div>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </div>
  )
}

function Row({ label, description, action }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 ml-4">{action}</div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const userId = useStore((s) => s.userId)
  const userName = useStore((s) => s.userName)
  const userEmail = useStore((s) => s.userEmail)
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
      a.href = url; a.download = `knome_export_${userId.slice(0, 8)}.json`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
    finally { setExporting(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`${API}/user/delete/${userId}`, { method: 'DELETE' })
      logout(); navigate('/login')
    } catch (e) { console.error(e) }
    finally { setDeleting(false) }
  }

  const initials = (userName || userEmail || 'U')[0].toUpperCase()
  const displayName = userName || userEmail?.split('@')[0] || 'Користувач'

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Налаштування</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Акаунт і персоналізація</p>
      </div>

      <div className="space-y-4">
        {/* Profile */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-100">{displayName}</p>
              <p className="text-sm text-zinc-500">{userEmail || userId?.slice(0, 16)}</p>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <Section title="Вигляд і мова">
          <Row
            label="Мова інтерфейсу"
            description="Мова повідомлень і підписів"
            action={
              <button onClick={() => setLanguage(language === 'ua' ? 'en' : 'ua')}
                className="btn-outline text-xs px-3 py-1.5">
                {language === 'ua' ? '🇺🇦 Українська' : '🇬🇧 English'}
              </button>
            }
          />
        </Section>

        {/* Data */}
        <Section title="Мої дані">
          <Row
            label="Завантажити дані"
            description="Всі твої записи у форматі JSON"
            action={
              <button onClick={handleExport} disabled={exporting} className="btn-outline text-xs px-3 py-1.5">
                {exporting ? '⏳' : '📥 Скачати'}
              </button>
            }
          />
        </Section>

        {/* Account */}
        <Section title="Акаунт">
          <Row
            label="Вийти з акаунту"
            description="Зберегти дані і вийти"
            action={
              <button onClick={() => { logout(); navigate('/login') }} className="btn-ghost text-xs px-3 py-1.5">
                Вийти
              </button>
            }
          />
        </Section>

        {/* Danger zone */}
        <div className="card border-red-500/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-red-500/10">
            <p className="section-label text-red-500/70">Небезпечна зона</p>
          </div>
          <div className="px-5 py-4">
            {!confirmDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Видалити акаунт</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Всі дані видаляться назавжди. Незворотньо.</p>
                </div>
                <button onClick={() => setConfirmDelete(true)} className="btn-danger text-xs ml-4">
                  Видалити
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-400 leading-relaxed">
                  Підтверди видалення — всі твої дані (чати, транзакції, check-ini) будуть видалені назавжди.
                </p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1">
                    {deleting ? 'Видалення...' : '🗑️ Так, видалити все'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="btn-outline flex-1">Скасувати</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-zinc-700 pb-2">Knome v0.5 · Зроблено з ❤️</p>
      </div>
    </div>
  )
}
