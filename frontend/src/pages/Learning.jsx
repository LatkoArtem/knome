import { useEffect, useState } from 'react'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

// ── SM-2 Flash Card component ──────────────────────────────────────────────
const QUALITY_LABELS = [
  { q: 1, label: 'Забув', color: 'border-red-500/40 text-red-400 hover:bg-red-500/10' },
  { q: 2, label: 'Важко', color: 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10' },
  { q: 3, label: 'Нормально', color: 'border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10' },
  { q: 4, label: 'Добре', color: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' },
  { q: 5, label: 'Легко', color: 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10' },
]

function FlashCards({ dueList, userId, onDone }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [rating, setRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState([])

  const card = dueList[index]
  const isLast = index === dueList.length - 1

  const handleRate = async (quality) => {
    if (submitting) return
    setRating(quality)
    setSubmitting(true)
    await fetch(`${API}/learning/review/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_name: card.topic_name, quality }),
    })
    setResults(prev => [...prev, { topic: card.topic_name, quality }])
    setSubmitting(false)

    if (isLast) {
      onDone(results.length + 1)
    } else {
      setTimeout(() => { setIndex(i => i + 1); setFlipped(false); setRating(null) }, 400)
    }
  }

  if (!card) return null

  return (
    <div className="card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <p className="section-label">Повторення SM-2</p>
        </div>
        <span className="text-xs text-zinc-500">{index + 1} / {dueList.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800 rounded-full mb-5">
        <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${((index) / dueList.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div
        className={`min-h-[120px] rounded-xl border flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-200 mb-5 ${
          flipped
            ? 'border-blue-500/30 bg-blue-500/5'
            : 'border-white/[0.06] bg-zinc-800/40 hover:bg-zinc-800/70'
        }`}
        onClick={() => !flipped && setFlipped(true)}
      >
        <p className="text-lg font-semibold text-zinc-100 text-center">{card.topic_name}</p>
        {!flipped ? (
          <p className="text-xs text-zinc-600 mt-3">Натисни, щоб оцінити запам'ятовування</p>
        ) : (
          <p className="text-xs text-zinc-500 mt-3">
            {card.repetitions > 0 ? `Повторень: ${card.repetitions} · Інтервал: ${card.interval_days} дн.` : 'Перше повторення'}
          </p>
        )}
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-zinc-500 text-center mb-3">Як добре запам'ятав?</p>
          <div className="grid grid-cols-5 gap-1.5">
            {QUALITY_LABELS.map(({ q, label, color }) => (
              <button
                key={q}
                onClick={() => handleRate(q)}
                disabled={submitting}
                className={`py-2 text-xs font-medium rounded-lg border transition-all duration-150 disabled:opacity-50 ${
                  rating === q ? 'opacity-100 scale-95' : 'opacity-90'
                } ${color}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Learning() {
  const userId = useStore((s) => s.userId)
  const [data, setData] = useState(null)
  const [due, setDue] = useState([])
  const [showCards, setShowCards] = useState(false)
  const [cardsDone, setCardsDone] = useState(null)
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
      body: JSON.stringify({ description: goalText }),
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

  const handleCardsDone = (count) => {
    setCardsDone(count)
    setShowCards(false)
    load()
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
              <button onClick={addGoal} disabled={saving || !goalText.trim()} className="btn-primary flex-1">
                {saving ? '...' : 'Додати ціль'}
              </button>
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
                <button onClick={addSession} disabled={saving || !sessionTopic.trim()} className="btn-primary flex-1">
                  {saving ? '...' : 'Записати'}
                </button>
                <button onClick={() => setShowSession(false)} className="btn-outline flex-1">Скасувати</button>
              </div>
            </div>
          </div>
        )}

        {/* Flash Cards prompt / done */}
        {cardsDone !== null && (
          <div className="card p-4 flex items-center gap-3 animate-fade-in">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-sm font-medium text-zinc-200">Повторення завершено!</p>
              <p className="text-xs text-zinc-500">Переглянуто {cardsDone} тем. Наступне повторення заплановано автоматично.</p>
            </div>
            <button onClick={() => setCardsDone(null)} className="btn-ghost text-xs ml-auto px-2 py-1">✕</button>
          </div>
        )}

        {due.length > 0 && !showCards && cardsDone === null && (
          <div className="card p-4 flex items-center gap-4 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-lg">🃏</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                {due.length} тем {due.length === 1 ? 'чекає' : 'чекають'} на повторення
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                SM-2 нагадує повторити: {due.slice(0, 3).map(d => d.topic_name).join(', ')}{due.length > 3 ? '...' : ''}
              </p>
            </div>
            <button onClick={() => setShowCards(true)} className="btn-primary text-xs shrink-0">
              Повторити →
            </button>
          </div>
        )}

        {showCards && due.length > 0 && (
          <FlashCards dueList={due} userId={userId} onDone={handleCardsDone} />
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
