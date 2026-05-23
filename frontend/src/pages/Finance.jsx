import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Target, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { IllustrationFinance } from '../components/Illustrations'

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
  const { t } = useTranslation()
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
      if (!res.ok) { setMsg({ err: true, text: d.detail || t('finance.monobank_err') }); return }
      setMsg({ err: false, text: t('finance.monobank_msg_connected', { name: d.name }) })
      setShowInput(false); setToken('')
      setStatus({ connected: true })
    } catch { setMsg({ err: true, text: t('finance.monobank_err_connection') }) }
    finally { setSaving(false) }
  }

  const sync = async () => {
    if (syncing) return
    setSyncing(true); setMsg(null)
    try {
      const res = await fetch(`${API}/monobank/sync/${userId}`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setMsg({ err: true, text: d.detail || t('finance.monobank_err_sync') }); return }
      setMsg({ err: false, text: t('finance.monobank_msg_synced', { count: d.imported }) })
      onSynced()
    } catch { setMsg({ err: true, text: t('finance.monobank_err_sync') }) }
    finally { setSyncing(false) }
  }

  const disconnect = async () => {
    await fetch(`${API}/monobank/disconnect/${userId}`, { method: 'DELETE' })
    setStatus({ connected: false }); setMsg({ err: false, text: t('finance.monobank_disconnected') })
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏦</span>
          <span className="text-sm font-medium text-zinc-200">{t('finance.monobank_title')}</span>
        </div>
        {status?.connected && (
          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('finance.monobank_connected')}
          </span>
        )}
      </div>

      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${msg.err ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
          {msg.text}
        </div>
      )}

      {!status?.connected ? (
        showInput ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">{t('finance.monobank_token_hint')}</p>
            <input value={token} onChange={e => setToken(e.target.value)}
              placeholder={t('finance.monobank_token_placeholder')} className="input font-mono text-xs" />
            <div className="flex gap-2">
              <button onClick={saveToken} disabled={saving || !token.trim()} className="btn-primary flex-1 text-xs py-2">
                {saving ? t('finance.monobank_btn_connecting') : t('finance.monobank_btn_connect')}
              </button>
              <button onClick={() => { setShowInput(false); setToken('') }} className="btn-outline flex-1 text-xs py-2">
                {t('finance.btn_cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowInput(true)} className="w-full border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            {t('finance.monobank_connect_btn')}
          </button>
        )
      ) : (
        <div className="flex gap-2">
          <button onClick={sync} disabled={syncing} className="btn-primary flex-1 text-xs py-2">
            {syncing ? t('finance.monobank_btn_syncing') : t('finance.monobank_btn_sync')}
          </button>
          <button onClick={disconnect} className="btn-ghost text-xs px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">✕</button>
        </div>
      )}
    </div>
  )
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
  const { t } = useTranslation()
  const chartData = buildDailyChart(transactions)
  const hasData = chartData.some(d => d.amount > 0)
  if (!hasData) return null
  return (
    <div className="card p-5">
      <p className="section-label mb-4">{t('finance.chart_title')}</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} barSize={14} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#a1a1aa' }}
            itemStyle={{ color: '#e4e4e7' }}
            formatter={(v) => [`${v.toFixed(0)} ${currency}`, t('finance.chart_tooltip')]}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#3b82f6" opacity={0.9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const BUDGET_CATS = ['їжа', 'transport', 'розваги', 'навчання', "здоров'я", 'комунальні', 'одяг', 'інше']

function BudgetSection({ userId, currency }) {
  const { t } = useTranslation()
  const [budgets, setBudgets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [cat, setCat] = useState('їжа')
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!userId) return
    fetch(`${API}/finance/budgets/${userId}`).then(r => r.ok ? r.json() : []).then(setBudgets).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!limit || saving) return
    setSaving(true)
    await fetch(`${API}/finance/budget/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat, limit_amount: parseFloat(limit) }),
    })
    setSaving(false); setShowForm(false); setLimit(''); load()
  }

  const remove = async (category) => {
    await fetch(`${API}/finance/budget/${userId}/${encodeURIComponent(category)}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center">
            <Target className="w-3 h-3 text-blue-400" />
          </div>
          <p className="section-label">{t('finance.budget_title')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-ghost text-xs px-2 py-1">
          <Plus className="w-3.5 h-3.5" /> {t('finance.budget_add')}
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-white/[0.04] bg-zinc-800/20 animate-fade-in">
          <div className="flex gap-2">
            <select value={cat} onChange={e => setCat(e.target.value)} className="input flex-1 bg-zinc-900 text-sm">
              {BUDGET_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" min="0" placeholder={t('finance.budget_limit')} value={limit}
              onChange={e => setLimit(e.target.value)}
              className="input w-28 text-sm" />
            <button onClick={save} disabled={saving || !limit} className="btn-primary text-xs px-3">
              {saving ? '...' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {budgets.length > 0 ? (
        <ul className="divide-y divide-white/[0.04]">
          {budgets.map(b => {
            const pct = Math.min(b.pct, 100)
            const over = b.pct > 100
            return (
              <li key={b.category} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`badge border ${CAT_COLOR[b.category] || CAT_COLOR['інше']}`}>{b.category}</span>
                    {over && <span className="text-xs text-red-400 font-medium">{t('finance.budget_over')}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={over ? 'text-red-400 font-semibold' : 'text-zinc-400'}>
                      {b.spent.toFixed(0)} / {b.limit_amount.toFixed(0)} {currency}
                    </span>
                    <button onClick={() => remove(b.category)} className="text-zinc-700 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="px-5 py-6 text-center text-sm text-zinc-600">
          {t('finance.budget_empty')}
        </div>
      )}
    </div>
  )
}

export default function Finance() {
  const { t } = useTranslation()
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
    <div className="page-narrow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{t('finance.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('finance.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('finance.btn_add')}
        </button>
      </div>

      <div className="space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="card p-5 animate-fade-in">
            <h3 className="text-sm font-medium text-zinc-200 mb-4">{t('finance.form_title')}</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="number" min="0" placeholder={t('finance.amount_label')} value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input flex-1" />
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="input w-24 bg-zinc-900">
                  {['UAH','USD','EUR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <select value={category} onChange={e => { setCategory(e.target.value); setHint(null) }}
                className="input bg-zinc-900">
                {CATS.map(c => <option key={c}>{c === 'авто' ? t('finance.auto_category') : c}</option>)}
              </select>
              <div>
                <input type="text" placeholder={t('finance.desc_placeholder')} value={desc}
                  onChange={e => onDescChange(e.target.value)}
                  className="input" />
                {category === 'авто' && hint && (
                  <p className="text-xs text-blue-400 mt-1.5 ml-0.5">{t('finance.hint_category')} <strong>{hint}</strong></p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving || !amount} className="btn-primary flex-1">
                  {saving ? t('finance.btn_saving') : t('finance.btn_save')}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1">{t('finance.btn_cancel')}</button>
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

        {/* Budget */}
        <BudgetSection userId={userId} currency={data?.currency || 'UAH'} />

        {/* Summary */}
        {data && (
          <div className="card p-5">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="section-label mb-1">{t('finance.summary_title')}</p>
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
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="section-label">{t('finance.recent_title')}</p>
            {data?.recent_transactions?.length > 0 && (
              <span className="text-2xs text-zinc-600 tabular-nums">
                {t('finance.recent_count', { count: data.recent_transactions.length })}
              </span>
            )}
          </div>
          {data?.recent_transactions?.length ? (
            <ul className="divide-y divide-white/[0.04]">
              {data.recent_transactions.map((tx, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/20 transition-colors group">
                  <span className={`badge shrink-0 border ${CAT_COLOR[tx.category] || CAT_COLOR['інше']}`}>
                    {tx.category}
                  </span>
                  <span className="flex-1 text-sm text-zinc-400 truncate min-w-0">
                    {tx.description || tx.category}
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-zinc-200 tabular-nums">
                      {tx.amount.toFixed(0)}
                      <span className="text-zinc-500 font-normal text-xs ml-0.5">{tx.currency}</span>
                    </p>
                    {tx.date && (
                      <p className="text-2xs text-zinc-700 tabular-nums">{tx.date.slice(0, 10)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center py-10 gap-3">
              <IllustrationFinance />
              <p className="empty-state-title">{t('finance.no_transactions_title')}</p>
              <p className="empty-state-sub">{t('finance.no_transactions_sub')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
