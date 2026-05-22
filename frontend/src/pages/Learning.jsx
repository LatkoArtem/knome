import { useEffect, useState } from 'react'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

export default function Learning() {
  const userId = useStore((s) => s.userId)
  const [data, setData] = useState(null)
  const [due, setDue] = useState([])
  const [showGoal, setShowGoal] = useState(false)
  const [showSession, setShowSession] = useState(false)
  const [goalText, setGoalText] = useState('')
  const [sessionTopic, setSessionTopic] = useState('')
  const [sessionMin, setSessionMin] = useState(30)
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!userId) return
    fetch(`${API}/learning/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setData).catch(() => {})
    fetch(`${API}/learning/due/${userId}`).then(r => r.ok ? r.json() : null).then(d => setDue(d?.due ?? [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addGoal = async () => {
    if (!goalText.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/learning/goal/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: goalText, domain: 'learning' }),
    })
    setSaving(false); setShowGoal(false); setGoalText(''); load()
  }

  const addSession = async () => {
    if (!sessionTopic.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/learning/session/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: sessionTopic, duration_min: sessionMin }),
    })
    setSaving(false); setShowSession(false); setSessionTopic(''); setSessionMin(30); load()
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Навчання</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Цілі, сесії, повторення</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowGoal(!showGoal); setShowSession(false) }} className="btn-outline text-xs">
            + Ціль
          </button>
          <button onClick={() => { setShowSession(!showSession); setShowGoal(false) }} className="btn-primary text-xs">
            + Сесія
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Add Goal */}
        {showGoal && (
          <div className="card p-5 animate-fade-in">
            <h3 className="text-sm font-medium text-zinc-200 mb-3">Нова навчальна ціль</h3>
            <input value={goalText} onChange={e => setGoalText(e.target.value)}
              placeholder="Наприклад: вивчити Python за 3 місяці..."
              className="input mb-3" onKeyDown={e => e.key === 'Enter' && addGoal()} />
            <div className="flex gap-2">
              <button onClick={addGoal} disabled={saving || !goalText.trim()} className="btn-primary flex-1">{saving ? '...' : 'Додати ціль'}</button>
              <button onClick={() => setShowGoal(false)} className="btn-outline flex-1">Скасувати</button>
            </div>
          </div>
        )}

        {/* Add Session */}
        {showSession && (
          <div className="card p-5 animate-fade-in">
            <h3 className="text-sm font-medium text-zinc-200 mb-3">Нова сесія навчання</h3>
            <div className="space-y-3">
              <input value={sessionTopic} onChange={e => setSessionTopic(e.target.value)}
                placeholder="Тема: Python, English, математика..."
                className="input" onKeyDown={e => e.key === 'Enter' && addSession()} />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-zinc-400">Тривалість</label>
                  <span className="text-sm font-semibold text-zinc-200">{sessionMin} хв</span>
                </div>
                <input type="range" min={5} max={180} step={5} value={sessionMin}
                  onChange={e => setSessionMin(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full bg-zinc-800 appearance-none cursor-pointer accent-blue-500" />
                <div className="flex justify-between text-[10px] text-zinc-700 mt-1"><span>5 хв</span><span>3 год</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addSession} disabled={saving || !sessionTopic.trim()} className="btn-primary flex-1">{saving ? '...' : 'Записати'}</button>
                <button onClick={() => setShowSession(false)} className="btn-outline flex-1">Скасувати</button>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Цього тижня', value: data.sessions_this_week, unit: 'сесій', color: 'text-blue-400' },
              { label: 'Хвилин',     value: data.total_minutes,       unit: 'хв',    color: 'text-indigo-400' },
              { label: 'Цілей',      value: data.goals?.length ?? 0,  unit: 'цілей', color: 'text-emerald-400' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{unit}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Due for review */}
        {due.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <p className="section-label">Потрібно повторити ({due.length})</p>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {due.map((r, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-zinc-300 font-medium">{r.topic_name}</span>
                  <span className="text-xs text-amber-400">
                    {r.days_overdue > 0 ? `${r.days_overdue} дн. прострочено` : 'Сьогодні'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Goals */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="section-label">Мої цілі</p>
          </div>
          {data?.goals?.length ? (
            <ul className="divide-y divide-white/[0.04]">
              {data.goals.map((g, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 w-4 h-4 rounded border border-blue-500/40 bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </span>
                  <span className="text-sm text-zinc-300">{g.description}</span>
                  <span className={`ml-auto shrink-0 text-xs ${g.status === 'done' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {g.status === 'done' ? '✓' : '●'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-zinc-600">Цілей ще немає — додай першу!</p>
          )}
        </div>

        {/* Recent sessions */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="section-label">Останні сесії</p>
          </div>
          {data?.recent_sessions?.length ? (
            <ul className="divide-y divide-white/[0.04]">
              {data.recent_sessions.slice(0, 5).map((s, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                  <span className="text-sm text-zinc-400">{s.topic || 'Сесія навчання'}</span>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="text-blue-400 font-medium">{s.duration} хв</span>
                    <span>{s.date?.slice(0, 10)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-zinc-600">Сесій ще немає</p>
          )}
        </div>
      </div>
    </div>
  )
}
