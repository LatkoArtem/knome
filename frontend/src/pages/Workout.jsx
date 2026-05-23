import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Dumbbell, Plus, X, Trophy, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

function StatTile({ value, label, color }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold leading-none ${color}`}>{value ?? '—'}</p>
      <p className="text-2xs text-zinc-600 mt-1">{label}</p>
    </div>
  )
}

export default function Workout() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)

  const [summary, setSummary]   = useState(null)
  const [sessions, setSessions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [duration, setDuration] = useState(60)
  const [rating, setRating]     = useState(0)
  const [notes, setNotes]       = useState('')
  const [exercises, setExercises] = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const load = () => {
    if (!userId) return
    fetch(`${API}/workout/summary/${userId}`)
      .then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
    fetch(`${API}/workout/sessions/${userId}?limit=10`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSessions(d?.sessions || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const parseExLines = (text) =>
    text.split('\n').map(l => l.trim()).filter(Boolean).map(name => ({ name }))

  const saveSession = async () => {
    if (saving) return
    setSaving(true)
    const exList = parseExLines(exercises)
    await fetch(`${API}/workout/session/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duration,
        rating,
        notes,
        program_id: summary?.active_program?.id || '',
        exercises: exList,
      }),
    }).catch(() => {})
    setSaving(false)
    setSaved(true)
    setNotes('')
    setExercises('')
    setRating(0)
    setDuration(60)
    setShowForm(false)
    setTimeout(() => setSaved(false), 3000)
    load()
  }

  const durPct = ((duration - 15) / 165) * 100
  const durTrack = { background: `linear-gradient(to right, #3b82f6 ${durPct}%, #27272a ${durPct}%)` }

  return (
    <div className="page-narrow">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="page-title">{t('workout.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('workout.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-1.5 shrink-0"
        >
          {showForm
            ? <><X className="w-3.5 h-3.5" />{t('workout.btn_cancel')}</>
            : <><Plus className="w-3.5 h-3.5" />{t('workout.btn_log')}</>
          }
        </button>
      </div>

      {saved && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 text-center animate-fade-in">
          ✓ Тренування збережено!
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">

        {/* Weekly stats */}
        <div className="card p-5 accent-blue">
          <p className="section-label mb-4">{t('workout.stats_title')}</p>
          <div className="grid grid-cols-3 gap-3">
            <StatTile value={summary?.sessions_this_week} label={t('workout.stat_week')}    color="text-blue-400" />
            <StatTile value={summary?.total_minutes}      label={t('workout.stat_minutes')}  color="text-blue-300" />
            <StatTile value={summary?.total_sessions}     label={t('workout.stat_total')}    color="text-zinc-400" />
          </div>
          {summary?.last_session_date && (
            <p className="text-2xs text-zinc-600 text-center mt-3">
              {t('workout.last_session')} {summary.last_session_date?.slice(0, 10)}
            </p>
          )}
        </div>

        {/* Active program */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-400 opacity-80" />
            <p className="text-sm font-semibold text-zinc-200">{t('workout.program_title')}</p>
          </div>
          {summary?.active_program ? (
            <div>
              <p className="text-base font-semibold text-zinc-100">{summary.active_program.name}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[
                  { label: summary.active_program.goal,                   cls: 'bg-blue-500/10 border-blue-500/20 text-blue-300'   },
                  { label: `${summary.active_program.days_per_week} дн/тиж`, cls: 'bg-zinc-700/50 border-zinc-600/30 text-zinc-400' },
                  { label: summary.active_program.level,                  cls: 'bg-zinc-700/50 border-zinc-600/30 text-zinc-400'   },
                ].map(({ label, cls }) => (
                  <span key={label} className={`badge ${cls}`}>{label}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state py-3">
              <p className="empty-state-title">{t('workout.program_empty_title')}</p>
              <p className="empty-state-sub">{t('workout.program_empty_sub')}</p>
            </div>
          )}
        </div>

        {/* Log session form */}
        {showForm && (
          <div className="card p-5 sm:col-span-2 animate-fade-in">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">{t('workout.form_title')}</h2>
            <div className="space-y-4">

              {/* Duration slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-zinc-300">{t('workout.duration_label')}</label>
                  <span className="text-sm font-bold text-zinc-100">{duration} хв</span>
                </div>
                <input
                  type="range" min={15} max={180} step={5} value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  style={durTrack} className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-2xs text-zinc-700 mt-1">
                  <span>15 хв</span><span>180 хв</span>
                </div>
              </div>

              {/* Exercises textarea */}
              <div>
                <label className="block text-sm text-zinc-300 mb-2">{t('workout.exercises_label')}</label>
                <textarea
                  value={exercises}
                  onChange={e => setExercises(e.target.value)}
                  rows={4}
                  placeholder={t('workout.exercises_placeholder')}
                  className="input font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-zinc-300 mb-2">{t('workout.notes_label')}</label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('workout.notes_placeholder')}
                  className="input"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm text-zinc-300 mb-2">{t('workout.rating_label')}</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      onClick={() => setRating(r)}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                        rating === r
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {r === 0 ? '—' : r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={saveSession} disabled={saving} className="btn-primary flex-1 py-2.5">
                  {saving
                    ? <span className="flex items-center gap-2 justify-center">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('workout.btn_saving')}
                      </span>
                    : t('workout.btn_save')
                  }
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost px-4">
                  {t('workout.btn_cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sessions history */}
        <div className="card overflow-hidden sm:col-span-2">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="section-label">{t('workout.history_title')}</p>
            <span className="text-2xs text-zinc-600 tabular-nums">{summary?.total_sessions ?? 0} всього</span>
          </div>
          {sessions.length > 0 ? (
            <ul className="divide-y divide-white/[0.04]">
              {sessions.map((s, i) => (
                <li key={s.id || i} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                  <span className="text-xs text-zinc-500 tabular-nums shrink-0">{s.date?.slice(0, 10)}</span>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-blue-400">⏱ {s.duration} хв</span>
                    {s.rating > 0 && (
                      <span className="text-amber-400">{'⭐'.repeat(Math.min(s.rating, 5))}</span>
                    )}
                    {s.notes && (
                      <span className="text-zinc-600 max-w-[140px] truncate hidden sm:block">{s.notes}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <Activity className="w-10 h-10 text-zinc-700" />
              <p className="empty-state-title">{t('workout.history_empty_title')}</p>
              <p className="empty-state-sub">{t('workout.history_empty_sub')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
