import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const ASSET_CATS = ['cash', 'real_estate', 'investment', 'vehicle', 'crypto', 'other_asset']
const DEBT_CATS  = ['loan', 'credit_card', 'mortgage', 'other_debt']

const ASSET_ICONS = {
  cash: '💵', real_estate: '🏠', investment: '📈', vehicle: '🚗', crypto: '₿', other_asset: '📦',
}
const DEBT_ICONS = {
  loan: '🏦', credit_card: '💳', mortgage: '🏡', other_debt: '📋',
}

function fmt(n, currency = 'UAH') {
  if (n == null) return '—'
  return `${n.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ${currency}`
}

export default function NetWorth() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)

  const [summary, setSummary] = useState(null)
  const [assets,  setAssets]  = useState([])
  const [debts,   setDebts]   = useState([])
  const [tab,     setTab]     = useState('assets')

  const [showAsset, setShowAsset] = useState(false)
  const [showDebt,  setShowDebt]  = useState(false)
  const [saving,    setSaving]    = useState(false)

  const [aName,  setAName]  = useState('')
  const [aCat,   setACat]   = useState('cash')
  const [aVal,   setAVal]   = useState('')
  const [aCur,   setACur]   = useState('UAH')
  const [aNotes, setANotes] = useState('')

  const [dName,  setDName]  = useState('')
  const [dCat,   setDCat]   = useState('loan')
  const [dAmt,   setDAmt]   = useState('')
  const [dCur,   setDCur]   = useState('UAH')
  const [dRate,  setDRate]  = useState('')
  const [dDue,   setDDue]   = useState('')

  const load = () => {
    if (!userId) return
    fetch(`${API}/networth/assets/${userId}`).then(r => r.ok ? r.json() : []).then(setAssets).catch(() => {})
    fetch(`${API}/networth/debts/${userId}`).then(r => r.ok ? r.json() : []).then(setDebts).catch(() => {})
    fetch(`${API}/networth/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addAsset = async () => {
    if (!aName.trim() || !aVal || saving) return
    setSaving(true)
    await fetch(`${API}/networth/asset/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: aName, category: aCat, value: parseFloat(aVal), currency: aCur, notes: aNotes }),
    })
    setSaving(false); setShowAsset(false)
    setAName(''); setAVal(''); setANotes(''); setACat('cash'); setACur('UAH')
    load()
  }

  const addDebt = async () => {
    if (!dName.trim() || !dAmt || saving) return
    setSaving(true)
    await fetch(`${API}/networth/debt/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dName, category: dCat, amount: parseFloat(dAmt),
        currency: dCur, interest_rate: parseFloat(dRate || 0), due_date: dDue,
      }),
    })
    setSaving(false); setShowDebt(false)
    setDName(''); setDAmt(''); setDRate(''); setDDue(''); setDCat('loan'); setDCur('UAH')
    load()
  }

  const deleteAsset = async (id) => {
    await fetch(`${API}/networth/asset/${id}`, { method: 'DELETE' })
    load()
  }
  const deleteDebt = async (id) => {
    await fetch(`${API}/networth/debt/${id}`, { method: 'DELETE' })
    load()
  }
  const markPaid = async (id) => {
    await fetch(`${API}/networth/debt/${id}/paid`, { method: 'PATCH' })
    load()
  }

  const nw = summary?.net_worth ?? 0
  const nwColor = nw >= 0 ? 'text-emerald-400' : 'text-red-400'
  const cur = summary?.currency || 'UAH'

  const activeDebts = debts.filter(d => !d.is_paid)
  const paidDebts   = debts.filter(d => d.is_paid)

  return (
    <div className="page-narrow">
      <div className="mb-6">
        <h1 className="page-title">{t('networth.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('networth.subtitle')}</p>
      </div>

      {/* Net Worth summary */}
      <div className="card p-5 mb-4 accent-blue">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Scale className="w-4 h-4 text-blue-400" />
          </div>
          <p className="section-label">{t('networth.net_worth_label')}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-500/8 rounded-xl p-3.5 border border-white/[0.04]">
            <p className="text-2xs text-zinc-500 mb-1.5">↑ {t('networth.total_assets')}</p>
            <p className="text-lg font-bold text-emerald-400 leading-none tabular-nums">
              {fmt(summary?.total_assets, cur)}
            </p>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3.5 border border-white/[0.04]">
            <p className="text-2xs text-zinc-500 mb-1.5">↓ {t('networth.total_debts')}</p>
            <p className="text-lg font-bold text-red-400 leading-none tabular-nums">
              {fmt(summary?.total_debts, cur)}
            </p>
          </div>
          <div className="bg-blue-500/8 rounded-xl p-3.5 border border-white/[0.04]">
            <p className="text-2xs text-zinc-500 mb-1.5">= {t('networth.net_worth_label')}</p>
            <p className={`text-lg font-bold leading-none tabular-nums ${nwColor}`}>
              {fmt(nw, cur)}
            </p>
          </div>
        </div>

        {/* Progress bar: assets vs debts */}
        {summary && (summary.total_assets + summary.total_debts) > 0 && (
          <div className="mt-4">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((summary.total_assets / (summary.total_assets + summary.total_debts)) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-2xs text-zinc-600 mt-1">
              <span>{t('networth.total_assets')}</span>
              <span>{t('networth.total_debts')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-4">
        {['assets', 'debts'].map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              tab === key ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            {key === 'assets'
              ? `${t('networth.tab_assets')} (${assets.length})`
              : `${t('networth.tab_debts')} (${activeDebts.length})`}
          </button>
        ))}
      </div>

      {/* Assets tab */}
      {tab === 'assets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowAsset(!showAsset); setShowDebt(false) }} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" /> {t('networth.btn_add_asset')}
            </button>
          </div>

          {showAsset && (
            <div className="card p-5 animate-fade-in">
              <h3 className="text-sm font-medium text-zinc-200 mb-4">{t('networth.asset_form_title')}</h3>
              <div className="space-y-3">
                <input value={aName} onChange={e => setAName(e.target.value)}
                  placeholder={t('networth.asset_name_placeholder')} className="input" />
                <div className="flex gap-2">
                  <select value={aCat} onChange={e => setACat(e.target.value)} className="input flex-1 bg-zinc-900 text-sm">
                    {ASSET_CATS.map(c => <option key={c} value={c}>{ASSET_ICONS[c]} {t(`networth.cat_${c}`)}</option>)}
                  </select>
                  <select value={aCur} onChange={e => setACur(e.target.value)} className="input w-24 bg-zinc-900 text-sm">
                    {['UAH','USD','EUR'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <input type="number" min="0" value={aVal} onChange={e => setAVal(e.target.value)}
                  placeholder={t('networth.asset_value')} className="input" />
                <input value={aNotes} onChange={e => setANotes(e.target.value)}
                  placeholder={t('networth.asset_notes')} className="input" />
                <div className="flex gap-2">
                  <button onClick={addAsset} disabled={saving || !aName.trim() || !aVal} className="btn-primary flex-1">
                    {saving ? t('networth.btn_saving') : t('networth.asset_btn_save')}
                  </button>
                  <button onClick={() => setShowAsset(false)} className="btn-outline flex-1">{t('networth.btn_cancel')}</button>
                </div>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            {assets.length ? (
              <ul className="divide-y divide-white/[0.04]">
                {assets.map(a => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/20 transition-colors group">
                    <span className="text-xl shrink-0">{ASSET_ICONS[a.category] || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 font-medium">{a.name}</p>
                      <p className="text-2xs text-zinc-500">{t(`networth.cat_${a.category}`)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-400 tabular-nums">{fmt(a.value, a.currency)}</p>
                    </div>
                    <button onClick={() => deleteAsset(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <TrendingUp className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="empty-state-title">{t('networth.asset_empty_title')}</p>
                <p className="empty-state-sub">{t('networth.asset_empty_sub')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debts tab */}
      {tab === 'debts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowDebt(!showDebt); setShowAsset(false) }} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" /> {t('networth.btn_add_debt')}
            </button>
          </div>

          {showDebt && (
            <div className="card p-5 animate-fade-in">
              <h3 className="text-sm font-medium text-zinc-200 mb-4">{t('networth.debt_form_title')}</h3>
              <div className="space-y-3">
                <input value={dName} onChange={e => setDName(e.target.value)}
                  placeholder={t('networth.debt_name_placeholder')} className="input" />
                <div className="flex gap-2">
                  <select value={dCat} onChange={e => setDCat(e.target.value)} className="input flex-1 bg-zinc-900 text-sm">
                    {DEBT_CATS.map(c => <option key={c} value={c}>{DEBT_ICONS[c]} {t(`networth.cat_${c}`)}</option>)}
                  </select>
                  <select value={dCur} onChange={e => setDCur(e.target.value)} className="input w-24 bg-zinc-900 text-sm">
                    {['UAH','USD','EUR'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="number" min="0" value={dAmt} onChange={e => setDAmt(e.target.value)}
                    placeholder={t('networth.debt_amount')} className="input flex-1" />
                  <input type="number" min="0" step="0.1" value={dRate} onChange={e => setDRate(e.target.value)}
                    placeholder={t('networth.debt_interest')} className="input w-28" />
                </div>
                <input type="date" value={dDue} onChange={e => setDDue(e.target.value)} className="input" />
                <div className="flex gap-2">
                  <button onClick={addDebt} disabled={saving || !dName.trim() || !dAmt} className="btn-primary flex-1">
                    {saving ? t('networth.btn_saving') : t('networth.debt_btn_save')}
                  </button>
                  <button onClick={() => setShowDebt(false)} className="btn-outline flex-1">{t('networth.btn_cancel')}</button>
                </div>
              </div>
            </div>
          )}

          {/* Active debts */}
          <div className="card overflow-hidden">
            {activeDebts.length ? (
              <ul className="divide-y divide-white/[0.04]">
                {activeDebts.map(d => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/20 transition-colors group">
                    <span className="text-xl shrink-0">{DEBT_ICONS[d.category] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 font-medium">{d.name}</p>
                      <p className="text-2xs text-zinc-500">
                        {t(`networth.cat_${d.category}`)}
                        {d.interest_rate > 0 && ` · ${d.interest_rate}%`}
                        {d.due_date && ` · ${d.due_date}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-red-400 tabular-nums">{fmt(d.amount, d.currency)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => markPaid(d.id)}
                        className="text-emerald-600 hover:text-emerald-400 transition-colors text-xs px-2 py-1 rounded-md hover:bg-emerald-500/10">
                        ✓
                      </button>
                      <button onClick={() => deleteDebt(d.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <TrendingDown className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="empty-state-title">{t('networth.debt_empty_title')}</p>
                <p className="empty-state-sub">{t('networth.debt_empty_sub')}</p>
              </div>
            )}
          </div>

          {/* Paid debts */}
          {paidDebts.length > 0 && (
            <div className="card overflow-hidden opacity-50">
              <div className="px-5 py-2 border-b border-white/[0.04]">
                <p className="text-2xs text-zinc-600 uppercase tracking-wide">{t('networth.debt_btn_paid')} ({paidDebts.length})</p>
              </div>
              <ul className="divide-y divide-white/[0.03]">
                {paidDebts.map(d => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-base shrink-0 grayscale">{DEBT_ICONS[d.category] || '📋'}</span>
                    <p className="text-sm text-zinc-600 line-through flex-1">{d.name}</p>
                    <p className="text-xs text-zinc-700 tabular-nums">{fmt(d.amount, d.currency)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
