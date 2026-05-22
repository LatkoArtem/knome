import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const CATS = ['авто', 'їжа', 'transport', 'розваги', 'навчання', "здоров'я", 'комунальні', 'одяг', 'інше']
const CAT_HINTS = [
  { cat: 'їжа',       kw: ['кава','pizza','піца','ресторан','кафе','продукти','atb','silpo','glovo','sushi','їжа','обід','макдо','burger','доставка'] },
  { cat: 'transport', kw: ['uber','bolt','uklon','таксі','метро','бензин','bus','паркінг','поїзд','авіа'] },
  { cat: 'розваги',   kw: ['netflix','spotify','кіно','concert','steam','game','бар','пиво','клуб'] },
  { cat: 'навчання',  kw: ['курс','udemy','coursera','книга','репетитор','skillshare'] },
  { cat: "здоров'я",  kw: ['аптека','pharmacy','gym','фітнес','лікар','ліки','вітаміни'] },
  { cat: 'комунальні',kw: ['інтернет','телефон','оренда','газ','електрика','kyivstar','vodafone','icloud'] },
  { cat: 'одяг',      kw: ['одяг','zara','hm','uniqlo','взуття','куртка','футболка'] },
]
const guessCategory = (desc) => {
  if (!desc) return null
  const l = desc.toLowerCase()
  for (const { cat, kw } of CAT_HINTS) if (kw.some(w => l.includes(w))) return cat
  return null
}

const CAT_COLOR = {
  'їжа':        'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'transport':  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'розваги':    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'навчання':   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  "здоров'я":   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'комунальні': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'одяг':       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'інше':       'bg-zinc-500/10 text-zinc-500 border-zinc-700',
}

function MonobankCard({ userId, onSynced }) {
  const [status, setStatus] = useState(null)
  const [showInput, setShowInput] = useState(false)
  const [token, setToken] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/monobank/status/${userId}`).then(r => r.ok ? r.json() : null).then(setStatus).catch(() => {})
  }, [userId])

  const saveToken = async () => {
    if (!token.trim() || saving) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`${API}/monobank/setup/${userId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg({ err: true, text: d.detail || 'Помилка' }); return }
      setMsg({ err: false, text: `Підключено: ${d.name}` })
      setShowInput(false); setToken('')
      setStatus({ connected: true })
    } catch { setMsg({ err: true, text: 'Помилка підключення' }) }
    finally { setSaving(false) }
  }

  const sync = async () => {
    if (syncing) return
    setSyncing(true); setMsg(null)
    try {
      const res = await fetch(`${API}/monobank/sync/${userId}`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setMsg({ err: true, text: d.detail || 'Помилка синхронізації' }); return }
      setMsg({ err: false, text: `Імпортовано ${d.imported} нових транзакцій` })
      onSynced()
    } catch { setMsg({ err: true, text: 'Помилка синхронізації' }) }
    finally { setSyncing(false) }
  }

  const disconnect = async () => {
    await fetch(`${API}/monobank/disconnect/${userId}`, { method: 'DELETE' })
    setStatus({ connected: false }); setMsg({ err: false, text: 'Відключено' })
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏦</span>
          <span className="text-sm font-medium text-zinc-200">Monobank</span>
        </div>
        {status?.connected && <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Підключено</span>}
      </div>

      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${msg.err ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
          {msg.text}
        </div>
      )}

      {!status?.connected ? (
        showInput ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Monobank → Налаштування → Інше → API → скопіюй токен</p>
            <input value={token} onChange={e => setToken(e.target.value)} placeholder="Твій токен..." className="input font-mono text-xs" />
            <div className="flex gap-2">
              <button onClick={saveToken} disabled={saving || !token.trim()} className="btn-primary flex-1 text-xs py-2">
                {saving ? 'Перевірка...' : 'Підключити'}
              </button>
              <button onClick={() => { setShowInput(false); setToken('') }} className="btn-outline flex-1 text-xs py-2">Скасувати</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowInput(true)} className="w-full border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            + Підключити Monobank
          </button>
        )
      ) : (
        <div className="flex gap-2">
          <button onClick={sync} disabled={syncing} className="btn-primary flex-1 text-xs py-2">
            {syncing ? 'Синхронізація...' : '↻ Синхронізувати (30 дн.)'}
          </button>
          <button onClick={disconnect} className="btn-ghost text-xs px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">✕</button>
        </div>
      )}
    </div>
  )
}

const CAT_CHART_COLORS = {
  'їжа': '#f97316', transport: '#3b82f6', розваги: '#a855f7',
  навчання: '#6366f1', "здоров'я": '#f43f5e', комунальні: '#71717a',
  одяг: '#eab308', інше: '#52525b',
}

function buildDailyChart(transactions = []) {
  const map = {}
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    map[key] = { date: key.slice(5), amount: 0 }
  }
  for (const tx of transactions) {
    const key = tx.date?.slice(0, 10)
    if (key && map[key]) map[key].amount += tx.amount
  }
  return Object.values(map)
}

function SpendingChart({ transactions, currency }) {
  const chartData = buildDailyChart(transactions)
  const hasData = chartData.some(d => d.amount > 0)
  if (!hasData) return null
  return (
    <div className="card p-5">
      <p className="section-label mb-4">Витрати за 14 днів</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} barSize={14} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#a1a1aa' }}
            itemStyle={{ color: '#e4e4e7' }}
            formatter={(v) => [`${v.toFixed(0)} ${currency}`, 'Витрати']}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#3b82f6" opacity={0.9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Finance() {
  const userId = useStore((s) => s.userId)
  const [data, setData] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('UAH')
  const [category, setCategory] = useState('авто')
  const [desc, setDesc] = useState('')
  const [hint, setHint] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!userId) return
    fetch(`${API}/finance/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setData).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const onDescChange = (v) => {
    setDesc(v)
    if (category === 'авто') setHint(guessCategory(v))
  }

  const save = async () => {
    if (!amount || saving) return
    setSaving(true)
    await fetch(`${API}/finance/transaction/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount), currency, category: category === 'авто' ? null : category, description: desc }),
    })
    setSaving(false); setShowForm(false); setAmount(''); setDesc(''); setCategory('авто'); setHint(null)
    load()
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Фінанси</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Витрати та транзакції</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Додати
        </button>
      </div>

      <div className="space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="card p-5 animate-fade-in">
            <h3 className="text-sm font-medium text-zinc-200 mb-4">Нова витрата</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="number" min="0" placeholder="Сума" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input flex-1" />
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="input w-24 bg-zinc-900">
                  {['UAH','USD','EUR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <select value={category} onChange={e => { setCategory(e.target.value); setHint(null) }}
                className="input bg-zinc-900">
                {CATS.map(c => <option key={c}>{c === 'авто' ? '✨ Авто-визначення' : c}</option>)}
              </select>
              <div>
                <input type="text" placeholder="Опис (ATB, Uber, Netflix...)" value={desc}
                  onChange={e => onDescChange(e.target.value)}
                  className="input" />
                {category === 'авто' && hint && (
                  <p className="text-xs text-blue-400 mt-1.5 ml-0.5">✓ Виявлено: <strong>{hint}</strong></p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving || !amount} className="btn-primary flex-1">{saving ? 'Збереження...' : 'Зберегти'}</button>
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1">Скасувати</button>
              </div>
            </div>
          </div>
        )}

        {/* Monobank */}
        <MonobankCard userId={userId} onSynced={load} />

        {/* Spending chart */}
        {data?.recent_transactions?.length > 0 && (
          <SpendingChart transactions={data.recent_transactions} currency={data.currency} />
        )}

        {/* Summary */}
        {data && (
          <div className="card p-5">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="section-label mb-1">Загальні витрати</p>
                <div className="stat-value">{data.total_spent?.toFixed(0)}
                  <span className="text-sm font-normal text-zinc-500 ml-1.5">{data.currency}</span>
                </div>
              </div>
              <span className="text-2xl">💸</span>
            </div>
            {data.by_category && Object.keys(data.by_category).length > 0 && (
              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                {Object.entries(data.by_category).sort(([,a],[,b]) => b - a).map(([cat, amt]) => {
                  const pct = Math.round((amt / data.total_spent) * 100)
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`badge border ${CAT_COLOR[cat] || CAT_COLOR['інше']}`}>{cat}</span>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <span>{pct}%</span>
                          <span className="font-medium text-zinc-300">{amt.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Transactions list */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="section-label">Останні транзакції</p>
          </div>
          {data?.recent_transactions?.length ? (
            <ul className="divide-y divide-white/[0.04]">
              {data.recent_transactions.map((tx, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
                  <span className={`badge shrink-0 border ${CAT_COLOR[tx.category] || CAT_COLOR['інше']}`}>{tx.category}</span>
                  <span className="flex-1 text-sm text-zinc-400 truncate">{tx.description || tx.category}</span>
                  <span className="text-sm font-semibold text-zinc-200 shrink-0">{tx.amount.toFixed(0)} <span className="text-zinc-500 font-normal">{tx.currency}</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-zinc-600">
              Транзакцій ще немає — додай першу вище
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
