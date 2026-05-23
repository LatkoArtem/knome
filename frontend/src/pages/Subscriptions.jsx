import { useEffect, useState } from 'react'
import { CreditCard, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const CYCLES = ['monthly', 'yearly', 'weekly']
const CATEGORIES = ['entertainment', 'productivity', 'health', 'education', 'cloud', 'other']

const CAT_COLORS = {
  entertainment: 'text-violet-400 border-violet-500/20 bg-violet-500/8',
  productivity:  'text-blue-400 border-blue-500/20 bg-blue-500/8',
  health:        'text-rose-400 border-rose-500/20 bg-rose-500/8',
  education:     'text-amber-400 border-amber-500/20 bg-amber-500/8',
  cloud:         'text-cyan-400 border-cyan-500/20 bg-cyan-500/8',
  other:         'text-zinc-500 border-zinc-700 bg-zinc-800',
}

export default function Subscriptions() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)

  const [subs, setSubs]         = useState([])
  const [monthlyTotal, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [amount, setAmount]     = useState('')
  const [cycle, setCycle]       = useState('monthly')
  const [category, setCategory] = useState('other')
  const [nextBilling, setNextBilling] = useState('')
  const [saving, setSaving]     = useState(false)
  const [deactivating, setDeactivating] = useState(null)

  const load = () => {
    if (!userId) return
    fetch(`${API}/subscriptions/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setSubs(d?.subscriptions || [])
        setTotal(d?.monthly_total || 0)
      }).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addSub = async () => {
    if (!name.trim() || !amount || saving) return
    setSaving(true)
    await fetch(`${API}/subscriptions/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), amount: parseFloat(amount),
        billing_cycle: cycle, category, next_billing: nextBilling
      }),
    }).catch(() => {})
    setName(''); setAmount(''); setCycle('monthly'); setCategory('other'); setNextBilling('')
    setShowForm(false); setSaving(false)
    load()
  }

  const deactivate = async (subId) => {
    setDeactivating(subId)
    await fetch(`${API}/subscriptions/${subId}/deactivate`, { method: 'PATCH' }).catch(() => {})
    setDeactivating(null)
    load()
  }

  const cycleLabel = c => ({
    monthly: t('subscriptions.cycle_monthly'),
    yearly: t('subscriptions.cycle_yearly'),
    weekly: t('subscriptions.cycle_weekly'),
  }[c] || c)

  const catLabel = c => ({
    entertainment: t('subscriptions.cat_entertainment'),
    productivity: t('subscriptions.cat_productivity'),
    health: t('subscriptions.cat_health'),
    education: t('subscriptions.cat_education'),
    cloud: t('subscriptions.cat_cloud'),
    other: t('subscriptions.cat_other'),
  }[c] || c)

  const monthlyAmount = (sub) => {
    const a = sub.amount || 0
    if (sub.billing_cycle === 'yearly') return a / 12
    if (sub.billing_cycle === 'weekly') return a * 4.33
    return a
  }

  return (
    <div className="page-narrow">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="page-title">{t('subscriptions.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('subscriptions.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-1.5 shrink-0"
        >
          {showForm
            ? <><X className="w-3.5 h-3.5" />{t('subscriptions.btn_cancel')}</>
            : <><Plus className="w-3.5 h-3.5" />{t('subscriptions.btn_add')}</>
          }
        </button>
      </div>

      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center accent-emerald">
            <p className="text-3xl font-bold text-emerald-400">{subs.length}</p>
            <p className="text-2xs text-zinc-600 mt-1">{t('subscriptions.stat_count')}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-zinc-100">
              {monthlyTotal.toFixed(0)}
              <span className="text-sm text-zinc-500 ml-1">{t('subscriptions.stat_monthly')}</span>
            </p>
            <p className="text-2xs text-zinc-600 mt-1">{t('subscriptions.monthly_total')}</p>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card p-5 animate-fade-in">
            <div className="space-y-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('subscriptions.form_name_placeholder')}
                className="input w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={t('subscriptions.form_amount')}
                  className="input flex-1"
                  min={0}
                  step={0.01}
                />
                <input
                  type="date"
                  value={nextBilling}
                  onChange={e => setNextBilling(e.target.value)}
                  className="input flex-1 text-zinc-400"
                />
              </div>
              {/* Billing cycle */}
              <div className="flex gap-2">
                {CYCLES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      cycle === c
                        ? 'border-emerald-500/50 bg-emerald-600/20 text-emerald-300'
                        : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cycleLabel(c)}
                  </button>
                ))}
              </div>
              {/* Category */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      category === cat
                        ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                        : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {catLabel(cat)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addSub} disabled={saving || !name.trim() || !amount} className="btn-primary flex-1 py-2">
                  {saving ? t('subscriptions.form_btn_saving') : t('subscriptions.form_btn_save')}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost px-4">
                  {t('subscriptions.btn_cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="section-label">{t('subscriptions.list_title')}</p>
            <span className="text-2xs text-zinc-600 tabular-nums">{subs.length}</span>
          </div>

          {subs.length > 0 ? (
            <ul className="divide-y divide-white/[0.04]">
              {subs.map((sub, i) => (
                <li key={sub.id || i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/20 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-bold text-zinc-400">
                    {sub.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{sub.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-2xs px-1.5 py-0.5 rounded border ${CAT_COLORS[sub.category] || CAT_COLORS.other}`}>
                        {catLabel(sub.category)}
                      </span>
                      <span className="text-2xs text-zinc-600">{cycleLabel(sub.billing_cycle)}</span>
                      {sub.next_billing && <span className="text-2xs text-zinc-700 tabular-nums hidden sm:block">{sub.next_billing?.slice(0, 10)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-200 tabular-nums">{sub.amount} {sub.currency}</p>
                      {sub.billing_cycle !== 'monthly' && (
                        <p className="text-2xs text-zinc-600 tabular-nums">{monthlyAmount(sub).toFixed(0)}/міс</p>
                      )}
                    </div>
                    <button
                      onClick={() => deactivate(sub.id)}
                      disabled={deactivating === sub.id}
                      className="opacity-0 group-hover:opacity-100 text-2xs text-zinc-600 hover:text-red-400 transition-all border border-zinc-800 hover:border-red-500/30 px-2 py-1 rounded-md"
                    >
                      {deactivating === sub.id ? '...' : t('subscriptions.btn_deactivate')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <CreditCard className="w-10 h-10 text-zinc-700" />
              <p className="empty-state-title">{t('subscriptions.list_empty_title')}</p>
              <p className="empty-state-sub">{t('subscriptions.list_empty_sub')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
