import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const CATEGORIES = ['авто', 'їжа', 'transport', 'розваги', 'навчання', "здоров'я", 'комунальні', 'одяг', 'інше']

const CAT_HINTS = [
  { cat: "їжа",       words: ["кава","pizza","піца","ресторан","кафе","продукти","atb","silpo","delivery","glovo","sushi","burger","їжа","обід"] },
  { cat: "transport", words: ["uber","bolt","uklon","таксі","метро","бензин","bus","parking","паркінг","поїзд"] },
  { cat: "розваги",   words: ["netflix","spotify","kino","кіно","concert","концерт","steam","game","бар","bar","пиво"] },
  { cat: "навчання",  words: ["курс","course","udemy","coursera","книга","book","репетитор"] },
  { cat: "здоров'я",  words: ["аптека","pharmacy","gym","фітнес","лікар","doctor","ліки"] },
  { cat: "комунальні",words: ["інтернет","internet","телефон","оренда","rent","газ","електрика","kyivstar","vodafone"] },
  { cat: "одяг",      words: ["одяг","zara","hm","uniqlo","взуття","shoes","куртка","футболка"] },
]

function guessCategory(desc) {
  if (!desc) return null
  const low = desc.toLowerCase()
  for (const { cat, words } of CAT_HINTS) {
    if (words.some(w => low.includes(w))) return cat
  }
  return null
}

const CURRENCIES = ['UAH', 'USD', 'EUR']

const CAT_COLORS = {
  'їжа': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'transport': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'розваги': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'навчання': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  "здоров'я": 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'комунальні': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  'одяг': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'інше': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function MonobankSection({ userId, onSynced }) {
  const [status, setStatus] = useState(null)
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [token, setToken] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'ok'|'err', text }

  const loadStatus = () => {
    if (!userId) return
    fetch(`${API}/monobank/status/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setStatus)
      .catch(() => {})
  }

  useEffect(() => { loadStatus() }, [userId])

  const handleSaveToken = async () => {
    if (!token.trim() || saving) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`${API}/monobank/setup/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.detail || 'Помилка' }); return }
      setMsg({ type: 'ok', text: `Підключено: ${data.name}` })
      setShowTokenInput(false); setToken('')
      loadStatus()
    } catch { setMsg({ type: 'err', text: 'Не вдалося підключитись' }) }
    finally { setSaving(false) }
  }

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true); setMsg(null)
    try {
      const res = await fetch(`${API}/monobank/sync/${userId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.detail || 'Помилка синхронізації' }); return }
      setMsg({ type: 'ok', text: `Імпортовано: ${data.imported} транзакцій (пропущено дублів: ${data.skipped})` })
      onSynced()
    } catch { setMsg({ type: 'err', text: 'Помилка під час синхронізації' }) }
    finally { setSyncing(false) }
  }

  const handleDisconnect = async () => {
    await fetch(`${API}/monobank/disconnect/${userId}`, { method: 'DELETE' })
    setStatus(null); loadStatus()
    setMsg({ type: 'ok', text: 'Monobank відключено' })
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏦</span>
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Monobank</span>
        {status?.connected && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Підключено
          </span>
        )}
      </div>

      {msg && (
        <p className={`text-xs px-3 py-2 rounded-lg mb-3 ${msg.type === 'ok'
          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'}`}>
          {msg.text}
        </p>
      )}

      {!status?.connected ? (
        showTokenInput ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Відкрий Monobank → Налаштування → Інше → API → скопіюй токен
            </p>
            <input
              type="text"
              placeholder="u…"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm font-mono"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveToken} disabled={saving || !token.trim()}
                className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Перевірка...' : 'Підключити'}
              </button>
              <button onClick={() => { setShowTokenInput(false); setToken('') }}
                className="flex-1 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm">
                Скасувати
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowTokenInput(true)}
            className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
            + Підключити Monobank
          </button>
        )
      ) : (
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing}
            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
            {syncing ? 'Синхронізація...' : '↻ Синхронізувати (30 дн.)'}
          </button>
          <button onClick={handleDisconnect}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 hover:text-rose-600 hover:border-rose-300">
            ✕
          </button>
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
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [categoryHint, setCategoryHint] = useState(null)

  const load = () => {
    if (!userId) return
    fetch(`${API}/finance/summary/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
  }

  useEffect(() => { load() }, [userId])

  const handleDescriptionChange = (val) => {
    setDescription(val)
    if (category === 'авто') setCategoryHint(guessCategory(val))
  }

  const save = async () => {
    if (!amount || saving) return
    setSaving(true)
    const bodyCategory = category === 'авто' ? null : category
    await fetch(`${API}/finance/transaction/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount), currency, category: bodyCategory, description }),
    })
    setSaving(false)
    setShowForm(false)
    setAmount(''); setDescription(''); setCategory('авто'); setCategoryHint(null)
    load()
  }

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <span className="text-xl">💰</span>
        <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">{t('finance.title')}</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white">
          + {t('finance.add_transaction')}
        </button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Add form */}
        {showForm && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
            <div className="flex gap-2">
              <input type="number" min="0" placeholder={t('finance.amount_label')} value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm" />
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="px-2 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm">
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <select value={category} onChange={e => { setCategory(e.target.value); setCategoryHint(null) }}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm">
              {CATEGORIES.map(c => <option key={c}>{c === 'авто' ? '✨ Авто (визначити автоматично)' : c}</option>)}
            </select>
            <div>
              <input type="text" placeholder={t('finance.description_label')} value={description}
                onChange={e => handleDescriptionChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm" />
              {category === 'авто' && categoryHint && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ml-1">
                  ✓ Схоже на: <strong>{categoryHint}</strong>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {t('finance.save')}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm">
                {t('finance.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Monobank */}
        <MonobankSection userId={userId} onSynced={load} />

        {/* Summary */}
        {data && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{t('finance.total')}</p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {data.total_spent?.toFixed(0)} <span className="text-lg font-normal">{data.currency}</span>
            </p>
            {data.by_category && Object.keys(data.by_category).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(data.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => (
                    <div key={cat} className="flex items-center gap-2 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[cat] || CAT_COLORS['інше']}`}>{cat}</span>
                      <span className="ml-auto font-medium">{amt.toFixed(0)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Transactions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t('finance.recent_title')}
          </h2>
          {data?.recent_transactions?.length ? (
            <ul className="space-y-2">
              {data.recent_transactions.map((tx, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${CAT_COLORS[tx.category] || CAT_COLORS['інше']}`}>
                    {tx.category}
                  </span>
                  <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">{tx.description || tx.category}</span>
                  <span className="font-semibold shrink-0">{tx.amount.toFixed(0)} {tx.currency}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">{t('finance.no_transactions')}</p>
          )}
        </section>
      </div>
    </div>
  )
}
