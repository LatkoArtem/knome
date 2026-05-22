import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

function MoodBar({ value, max = 10, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}/{max}</span>
    </div>
  )
}

export default function Health() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)
  const [data, setData] = useState(null)
  const [sleep, setSleep] = useState('')
  const [mood, setMood] = useState(7)
  const [energy, setEnergy] = useState(7)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = () => {
    if (!userId) return
    fetch(`${API}/health-domain/summary/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
  }

  useEffect(() => { load() }, [userId])

  const saveCheckin = async () => {
    if (!sleep || saving) return
    setSaving(true)
    await fetch(`${API}/health-domain/checkin/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sleep_hours: parseFloat(sleep), mood, energy, notes }),
    })
    setSaving(false)
    setSaved(true)
    setSleep('')
    setNotes('')
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <span className="text-xl">❤️</span>
        <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">{t('health.title')}</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Stats */}
        {data && data.checkin_count > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-3">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-1">{t('health.avg_mood')}</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{data.avg_mood_7d}<span className="text-sm font-normal">/10</span></p>
            </div>
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{t('health.avg_sleep')}</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.avg_sleep_7d}<span className="text-sm font-normal">г</span></p>
            </div>
          </div>
        )}

        {/* Check-in form */}
        <section className="rounded-2xl border border-rose-200 dark:border-rose-800 p-4 space-y-4">
          <h2 className="font-semibold text-sm">{t('health.checkin_title')}</h2>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('health.sleep_label')}</label>
            <input type="number" min="0" max="24" step="0.5" value={sleep}
              onChange={e => setSleep(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{t('health.mood_label')}: {mood}</label>
            <input type="range" min="1" max="10" value={mood} onChange={e => setMood(Number(e.target.value))} className="w-full accent-rose-500" />
            <MoodBar value={mood} color="bg-rose-400" />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{t('health.energy_label')}: {energy}</label>
            <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(Number(e.target.value))} className="w-full accent-amber-500" />
            <MoodBar value={energy} color="bg-amber-400" />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('health.notes_label')}</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm" />
          </div>

          <button onClick={saveCheckin} disabled={saving || !sleep}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
              saved ? 'bg-green-500 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50'
            }`}>
            {saved ? 'Збережено!' : t('health.save')}
          </button>
        </section>

        {/* History */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t('health.history_title')}
          </h2>
          {data?.recent_checkins?.length ? (
            <ul className="space-y-2">
              {data.recent_checkins.map((c, i) => (
                <li key={i} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">{c.date?.slice(0, 10)}</span>
                    <span className="text-xs">{c.sleep_hours}г сну</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Настрій: <strong className="text-rose-500">{c.mood}/10</strong></span>
                    <span>Енергія: <strong className="text-amber-500">{c.energy}/10</strong></span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">{t('health.no_checkins')}</p>
          )}
        </section>
      </div>
    </div>
  )
}
