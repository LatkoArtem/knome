import { useEffect, useState } from 'react'
import { Target, ListChecks, Plus, X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const GOAL_CATEGORIES = ['personal', 'career', 'health', 'finance', 'learning', 'relationships']
const BUCKET_CATEGORIES = ['adventure', 'travel', 'personal', 'career', 'health', 'learning']

const STATUS_STYLES = {
  active: 'text-blue-400 border-blue-500/20 bg-blue-500/8',
  done:   'text-emerald-400 border-emerald-500/20 bg-emerald-500/8',
  paused: 'text-zinc-500 border-zinc-700 bg-zinc-800',
}

/* ─── Life Goals Tab ───────────────────────────────────────────── */
function LifeGoalsTab({ userId }) {
  const { t } = useTranslation()
  const [goals, setGoals]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [category, setCategory] = useState('personal')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving]     = useState(false)

  const load = () => {
    fetch(`${API}/goals/life/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setGoals(d?.goals || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addGoal = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/goals/life/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: desc, category, target_date: deadline }),
    }).catch(() => {})
    setTitle(''); setDesc(''); setDeadline(''); setCategory('personal')
    setShowForm(false); setSaving(false)
    load()
  }

  const markDone = async (goalId) => {
    await fetch(`${API}/goals/life/${goalId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    }).catch(() => {})
    load()
  }

  const catLabel = cat => ({
    personal: t('goals.cat_personal'), career: t('goals.cat_career'),
    health: t('goals.cat_health'), finance: t('goals.cat_finance'),
    learning: t('goals.cat_learning'), relationships: t('goals.cat_relationships'),
  }[cat] || cat)

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(v => !v)}
        className="btn-primary flex items-center gap-1.5 w-full justify-center"
      >
        {showForm ? <><X className="w-3.5 h-3.5" />{t('goals.btn_cancel')}</> : <><Plus className="w-3.5 h-3.5" />{t('goals.btn_add_goal')}</>}
      </button>

      {showForm && (
        <div className="card p-5 animate-fade-in">
          <div className="space-y-3">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addGoal()}
              placeholder={t('goals.goal_title_placeholder')}
              className="input w-full"
              autoFocus
            />
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={t('goals.goal_desc')}
              className="input resize-none w-full"
              rows={2}
            />
            <div className="flex gap-2 flex-wrap">
              {GOAL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    category === cat
                      ? 'border-blue-500/50 bg-blue-600/20 text-blue-300'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {catLabel(cat)}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="input w-full text-zinc-400"
              placeholder={t('goals.goal_deadline')}
            />
            <button onClick={addGoal} disabled={saving || !title.trim()} className="btn-primary w-full py-2">
              {saving ? t('goals.goal_btn_saving') : t('goals.goal_btn_save')}
            </button>
          </div>
        </div>
      )}

      {goals.length > 0 ? (
        <div className="space-y-2">
          {goals.map((g, i) => (
            <div key={g.id || i} className="card p-4 group">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => g.status !== 'done' && markDone(g.id)}
                  className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center mt-0.5 transition-colors ${
                    g.status === 'done'
                      ? 'bg-emerald-600 border-emerald-500'
                      : 'border-zinc-700 hover:border-blue-500 hover:bg-blue-500/10'
                  }`}
                >
                  {g.status === 'done' && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${g.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                    {g.title}
                  </p>
                  {g.description && <p className="text-xs text-zinc-600 mt-0.5">{g.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-2xs px-1.5 py-0.5 rounded border ${STATUS_STYLES[g.status] || STATUS_STYLES.active}`}>
                      {t(`goals.status_${g.status}`) || g.status}
                    </span>
                    <span className="text-2xs text-zinc-600">{catLabel(g.category)}</span>
                    {g.target_date && <span className="text-2xs text-zinc-700 tabular-nums">{g.target_date?.slice(0,10)}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Target className="w-10 h-10 text-zinc-700" />
          <p className="empty-state-title">{t('goals.goals_empty_title')}</p>
          <p className="empty-state-sub">{t('goals.goals_empty_sub')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Bucket List Tab ──────────────────────────────────────────── */
function BucketTab({ userId }) {
  const { t } = useTranslation()
  const [items, setItems]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState('adventure')
  const [saving, setSaving]     = useState(false)
  const [completing, setCompleting] = useState(null)

  const load = () => {
    fetch(`${API}/goals/bucket/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setItems(d?.items || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addItem = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/goals/bucket/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), category }),
    }).catch(() => {})
    setTitle(''); setCategory('adventure')
    setShowForm(false); setSaving(false)
    load()
  }

  const complete = async (itemId) => {
    setCompleting(itemId)
    await fetch(`${API}/goals/bucket/${itemId}/complete`, { method: 'PATCH' }).catch(() => {})
    setCompleting(null)
    load()
  }

  const catLabel = cat => ({
    adventure: t('goals.cat_adventure'), travel: t('goals.cat_travel'),
    personal: t('goals.cat_personal'), career: t('goals.cat_career'),
    health: t('goals.cat_health'), learning: t('goals.cat_learning'),
  }[cat] || cat)

  const pending = items.filter(i => i.status !== 'done')
  const done    = items.filter(i => i.status === 'done')

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(v => !v)}
        className="btn-primary flex items-center gap-1.5 w-full justify-center"
      >
        {showForm ? <><X className="w-3.5 h-3.5" />{t('goals.btn_cancel')}</> : <><Plus className="w-3.5 h-3.5" />{t('goals.btn_add_bucket')}</>}
      </button>

      {showForm && (
        <div className="card p-5 animate-fade-in">
          <div className="space-y-3">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder={t('goals.bucket_placeholder')}
              className="input w-full"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              {BUCKET_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    category === cat
                      ? 'border-amber-500/50 bg-amber-600/20 text-amber-300'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {catLabel(cat)}
                </button>
              ))}
            </div>
            <button onClick={addItem} disabled={saving || !title.trim()} className="btn-primary w-full py-2">
              {saving ? t('goals.bucket_btn_saving') : t('goals.bucket_btn_save')}
            </button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-2">
          {[...pending, ...done].map((item, i) => (
            <div key={item.id || i} className={`card p-4 group transition-opacity ${item.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => item.status !== 'done' && complete(item.id)}
                  disabled={completing === item.id || item.status === 'done'}
                  className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                    item.status === 'done'
                      ? 'bg-emerald-600/30 border-emerald-600'
                      : 'border-zinc-700 hover:border-amber-500 hover:bg-amber-500/10'
                  }`}
                >
                  {completing === item.id
                    ? <span className="w-3 h-3 border border-amber-500/50 border-t-amber-400 rounded-full animate-spin" />
                    : item.status === 'done' && <Check className="w-3 h-3 text-emerald-400" />
                  }
                </button>
                <span className={`flex-1 text-sm min-w-0 ${item.status === 'done' ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
                  {item.title}
                </span>
                <span className="text-2xs text-zinc-600 shrink-0">{catLabel(item.category)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ListChecks className="w-10 h-10 text-zinc-700" />
          <p className="empty-state-title">{t('goals.bucket_empty_title')}</p>
          <p className="empty-state-sub">{t('goals.bucket_empty_sub')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function Goals() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)
  const [tab, setTab]       = useState('life')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/goals/summary/${userId}`)
      .then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
  }, [userId])

  return (
    <div className="page-narrow">
      <div className="mb-6">
        <h1 className="page-title">{t('goals.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('goals.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('goals.stat_active'), value: summary?.active_goals,  color: 'text-blue-400'    },
            { label: t('goals.stat_done'),   value: summary?.done_goals,    color: 'text-emerald-400' },
            { label: t('goals.stat_bucket'), value: summary?.bucket_total,  color: 'text-amber-400'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-2xl font-bold leading-none ${color}`}>{value ?? '—'}</p>
              <p className="text-2xs text-zinc-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
        {summary?.bucket_total > 0 && (
          <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.round((summary.bucket_done / summary.bucket_total) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-900 p-1 rounded-xl border border-white/[0.06]">
        {[
          { id: 'life',   label: t('goals.tab_life'),   Icon: Target     },
          { id: 'bucket', label: t('goals.tab_bucket'), Icon: ListChecks },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'life'   && <LifeGoalsTab userId={userId} />}
      {tab === 'bucket' && <BucketTab   userId={userId} />}
    </div>
  )
}
