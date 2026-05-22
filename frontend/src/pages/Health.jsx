import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

function Slider({ label, value, onChange, min = 1, max = 10, accentClass = 'accent-blue-500' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <span className="text-sm font-semibold text-zinc-200">{value}<span className="text-zinc-500 font-normal">/{max}</span></span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-full bg-zinc-800 appearance-none cursor-pointer ${accentClass}`} />
      <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

export default function Health() {
  const userId = useStore((s) => s.userId)
  const [data, setData] = useState(null)
  const [sleep, setSleep] = useState(7)
  const [mood, setMood] = useState(7)
  const [energy, setEnergy] = useState(7)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = () => {
    if (!userId) return
    fetch(`${API}/health-domain/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setData).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const saveCheckin = async () => {
    if (saving) return
    setSaving(true)
    await fetch(`${API}/health-domain/checkin/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sleep_hours: sleep, mood, energy, notes }),
    })
    setSaving(false); setSaved(true); setNotes('')
    setTimeout(() => setSaved(false), 3000)
    load()
  }

  const moodEmoji = mood <= 3 ? '😔' : mood <= 5 ? '😐' : mood <= 7 ? '🙂' : '😊'
  const sleepStatus = sleep < 6
    ? { text: 'Мало сну', c: 'text-red-400' }
    : sleep < 7 ? { text: 'Нормально', c: 'text-amber-400' }
    : { text: 'Відмінно', c: 'text-emerald-400' }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Здоров'я</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Щоденний трекінг самопочуття</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Check-in form */}
        <div className="card p-5 sm:row-span-2">
          <h2 className="text-sm font-semibold text-zinc-200 mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Щоденний check-in
          </h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-300">🌙 Сон (годин)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-200">{sleep}<span className="text-zinc-500"> год</span></span>
                  <span className={`text-xs font-medium ${sleepStatus.c}`}>{sleepStatus.text}</span>
                </div>
              </div>
              <input type="range" min={0} max={12} step={0.5} value={sleep}
                onChange={e => setSleep(Number(e.target.value))}
                className="w-full h-1.5 rounded-full bg-zinc-800 appearance-none cursor-pointer accent-blue-500" />
              <div className="flex justify-between text-[10px] text-zinc-700 mt-1"><span>0</span><span>12 год</span></div>
            </div>

            <Slider label={`${moodEmoji} Настрій`} value={mood} onChange={setMood} accentClass="accent-rose-500" />
            <Slider label="⚡ Енергія" value={energy} onChange={setEnergy} accentClass="accent-amber-500" />

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">📝 Нотатки (необов'язково)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Як себе почуваєш сьогодні?..."
                className="input resize-none" />
            </div>

            <button onClick={saveCheckin} disabled={saving} className="btn-primary w-full py-2.5">
              {saving ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Зберігаємо...
                </span>
              ) : saved ? '✓ Check-in збережено!' : 'Зберегти check-in'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Середнє за тиждень
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Настрій',   value: data.avg_mood_7d,            unit: '/10',   color: 'text-rose-400',    icon: '❤️' },
                { label: 'Сон',       value: data.avg_sleep_7d,           unit: ' год',  color: 'text-blue-400',    icon: '🌙' },
                { label: 'Check-in',  value: data.checkin_count,           unit: ' дн.',  color: 'text-emerald-400', icon: '✅' },
                { label: 'Калорії',   value: data.avg_calories_7d?.toFixed(0) || '—', unit: ' ккал', color: 'text-amber-400', icon: '🍽️' },
              ].map(({ label, value, unit, color, icon }) => (
                <div key={label} className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-xs text-zinc-500 mb-1.5">{icon} {label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value ?? '—'}
                    <span className="text-xs font-normal text-zinc-500">{unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trend chart */}
        {data?.recent_checkins?.length > 1 && (
          <div className="card p-5 sm:col-span-2">
            <p className="section-label mb-4">Тренд настрою і сну</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={[...data.recent_checkins].reverse().map(c => ({
                  date: c.date?.slice(5, 10),
                  mood: c.mood,
                  sleep: c.sleep_hours,
                }))}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#71717a', paddingTop: 8 }} />
                <Line type="monotone" dataKey="mood" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e' }} name="Настрій" />
                <Line type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Сон (год)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="section-label">Останні записи</p>
            <span className="text-xs text-zinc-600">{data?.checkin_count ?? 0} записів</span>
          </div>
          {data?.recent_checkins?.length ? (
            <ul className="divide-y divide-white/[0.04]">
              {data.recent_checkins.slice(0, 6).map((c, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                  <span className="text-xs text-zinc-500 shrink-0">{c.date?.slice(0, 10)}</span>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-blue-400">🌙 {c.sleep_hours}г</span>
                    <span className="text-rose-400">❤️ {c.mood}</span>
                    <span className="text-amber-400">⚡ {c.energy}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-zinc-600">Записів ще немає — зроби перший check-in!</p>
          )}
        </div>
      </div>
    </div>
  )
}
