import { useEffect, useState } from 'react'
import { Home as HomeIcon, ShoppingCart, UtensilsCrossed, Plus, X, Check, Trash2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const TASK_CATEGORIES = ['cleaning', 'maintenance', 'garden', 'appliances', 'other']
const TASK_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
const SHOP_CATEGORIES  = ['produce', 'dairy', 'meat', 'bakery', 'household', 'hygiene', 'other']

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function getWeekStart() {
  const today = new Date()
  const day = today.getDay() || 7
  const mon = new Date(today)
  mon.setDate(today.getDate() - day + 1)
  return mon.toISOString().split('T')[0]
}

function dueDateColor(nextDue) {
  if (!nextDue) return 'text-zinc-500'
  const today = new Date().toISOString().split('T')[0]
  if (nextDue < today) return 'text-red-400'
  const soon = new Date()
  soon.setDate(soon.getDate() + 3)
  if (nextDue <= soon.toISOString().split('T')[0]) return 'text-amber-400'
  return 'text-emerald-400'
}

/* ─── Tasks Tab ─────────────────────────────────────────────────── */
function TasksTab({ userId }) {
  const { t } = useTranslation()
  const [tasks, setTasks]       = useState([])
  const [overdue, setOverdue]   = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [category, setCategory] = useState('cleaning')
  const [frequency, setFreq]    = useState('monthly')
  const [saving, setSaving]     = useState(false)

  const load = () => {
    fetch(`${API}/home/tasks/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setTasks(d.tasks); setOverdue(d.overdue) } })
      .catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/home/task/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), category, frequency }),
    })
    setSaving(false)
    setName(''); setShowForm(false)
    load()
  }

  const markDone = async (task) => {
    await fetch(`${API}/home/task/${task.id}/done?frequency=${task.frequency}`, { method: 'PATCH' })
    load()
  }

  const del = async (id) => {
    await fetch(`${API}/home/task/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-zinc-100">{tasks.length}</p>
          <p className="text-2xs text-zinc-500 mt-1">{t('home.stat_total')}</p>
        </div>
        <div className="card text-center py-4">
          <p className={`text-2xl font-bold ${overdue > 0 ? 'text-red-400' : 'text-zinc-100'}`}>{overdue}</p>
          <p className="text-2xs text-zinc-500 mt-1">{t('home.stat_overdue')}</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-emerald-400">
            {tasks.filter(t => t.last_done === new Date().toISOString().split('T')[0]).length}
          </p>
          <p className="text-2xs text-zinc-500 mt-1">{t('home.stat_done_today')}</p>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> {t('home.btn_add_task')}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card space-y-3">
          <p className="font-medium text-sm text-zinc-200">{t('home.task_form_title')}</p>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder={t('home.task_name_placeholder')}
            className="input-field w-full text-sm"
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-2xs text-zinc-500 mb-1 block">{t('home.task_category')}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-field w-full text-sm">
                {TASK_CATEGORIES.map(c => <option key={c} value={c}>{t(`home.cat_${c}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs text-zinc-500 mb-1 block">{t('home.task_frequency')}</label>
              <select value={frequency} onChange={e => setFreq(e.target.value)} className="input-field w-full text-sm">
                {TASK_FREQUENCIES.map(f => <option key={f} value={f}>{t(`home.freq_${f}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">{t('home.btn_cancel')}</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? t('home.btn_saving') : t('home.task_btn_save')}
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="card text-center py-10">
          <HomeIcon className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-400 font-medium text-sm">{t('home.tasks_empty_title')}</p>
          <p className="text-zinc-600 text-xs mt-1">{t('home.tasks_empty_sub')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const color = dueDateColor(task.next_due)
            const today = new Date().toISOString().split('T')[0]
            const isOverdue = task.next_due && task.next_due < today
            return (
              <div key={task.id} className="card flex items-center gap-3 group">
                <button
                  onClick={() => markDone(task)}
                  className="w-7 h-7 rounded-full border border-zinc-700 flex items-center justify-center shrink-0 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{task.name}</p>
                  <p className="text-2xs text-zinc-600">
                    {t(`home.cat_${task.category}`)} · {t(`home.freq_${task.frequency}`)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-medium ${color}`}>
                    {isOverdue ? t('home.overdue') : task.next_due}
                  </p>
                  {task.last_done && (
                    <p className="text-2xs text-zinc-600">{t('home.last_done')}: {task.last_done}</p>
                  )}
                </div>
                <button
                  onClick={() => del(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Shopping Tab ──────────────────────────────────────────────── */
function ShoppingTab({ userId }) {
  const { t } = useTranslation()
  const [toBuy, setToBuy]       = useState([])
  const [bought, setBought]     = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [quantity, setQty]      = useState('1')
  const [category, setCategory] = useState('other')
  const [regular, setRegular]   = useState(false)
  const [saving, setSaving]     = useState(false)

  const load = () => {
    fetch(`${API}/home/shopping/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setToBuy(d.to_buy); setBought(d.bought) } })
      .catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/home/shopping/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), category, quantity, regular }),
    })
    setSaving(false)
    setName(''); setQty('1'); setRegular(false); setShowForm(false)
    load()
  }

  const markBought = async (id) => {
    await fetch(`${API}/home/shopping/${id}/bought`, { method: 'PATCH' })
    load()
  }

  const unmark = async (id) => {
    await fetch(`${API}/home/shopping/${id}/unmark`, { method: 'PATCH' })
    load()
  }

  const del = async (id) => {
    await fetch(`${API}/home/shopping/${id}`, { method: 'DELETE' })
    load()
  }

  const clearBought = async () => {
    await fetch(`${API}/home/shopping/${userId}/clear-bought`, { method: 'DELETE' })
    load()
  }

  const ShopItem = ({ item, isBought }) => (
    <div className={`card flex items-center gap-3 group ${isBought ? 'opacity-50' : ''}`}>
      <button
        onClick={() => isBought ? unmark(item.id) : markBought(item.id)}
        className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${
          isBought ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-zinc-700 hover:border-emerald-500/40 hover:bg-emerald-500/10'
        }`}
      >
        {isBought && <Check className="w-3 h-3 text-emerald-400" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-zinc-200 ${isBought ? 'line-through' : ''}`}>{item.name}</p>
        <p className="text-2xs text-zinc-600">
          {item.quantity !== '1' && <span>{item.quantity} · </span>}
          {t(`home.shop_cat_${item.category}`)}
          {item.regular && <span className="ml-1 text-blue-400/60">↻</span>}
        </p>
      </div>
      <button onClick={() => del(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <span className="text-sm text-zinc-400">{t('home.shop_to_buy')}: <span className="font-semibold text-zinc-200">{toBuy.length}</span></span>
          <span className="text-sm text-zinc-500">{t('home.shop_bought')}: {bought.length}</span>
        </div>
        <div className="flex gap-2">
          {bought.length > 0 && (
            <button onClick={clearBought} className="btn-ghost text-xs flex items-center gap-1.5">
              <Trash2 className="w-3 h-3" /> {t('home.shop_clear')}
            </button>
          )}
          <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> {t('home.btn_add_item')}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card space-y-3">
          <p className="font-medium text-sm text-zinc-200">{t('home.item_form_title')}</p>
          <div className="flex gap-2">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder={t('home.item_name_placeholder')}
              className="input-field flex-1 text-sm"
              onKeyDown={e => e.key === 'Enter' && save()}
            />
            <input
              value={quantity} onChange={e => setQty(e.target.value)}
              placeholder={t('home.item_qty')}
              className="input-field w-20 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-field text-sm flex-1">
              {SHOP_CATEGORIES.map(c => <option key={c} value={c}>{t(`home.shop_cat_${c}`)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer shrink-0">
              <input type="checkbox" checked={regular} onChange={e => setRegular(e.target.checked)} className="accent-blue-500" />
              {t('home.item_regular')}
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">{t('home.btn_cancel')}</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? t('home.btn_saving') : t('home.item_btn_save')}
            </button>
          </div>
        </div>
      )}

      {/* To buy */}
      {toBuy.length === 0 && bought.length === 0 ? (
        <div className="card text-center py-10">
          <ShoppingCart className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-400 font-medium text-sm">{t('home.shop_empty_title')}</p>
          <p className="text-zinc-600 text-xs mt-1">{t('home.shop_empty_sub')}</p>
        </div>
      ) : (
        <>
          {toBuy.length > 0 && (
            <div className="space-y-2">
              {toBuy.map(item => <ShopItem key={item.id} item={item} isBought={false} />)}
            </div>
          )}
          {bought.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs text-zinc-600 font-medium uppercase tracking-wider px-1">{t('home.shop_bought')} ({bought.length})</p>
              {bought.map(item => <ShopItem key={item.id} item={item} isBought />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Meals Tab ──────────────────────────────────────────────────── */
function MealsTab({ userId }) {
  const { t } = useTranslation()
  const weekStart = getWeekStart()
  const [plan, setPlan] = useState({
    monday: '', tuesday: '', wednesday: '', thursday: '',
    friday: '', saturday: '', sunday: '', prep_notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    fetch(`${API}/home/meal-plan/${userId}?week_start=${weekStart}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlan(prev => ({ ...prev, ...d })) })
      .catch(() => {})
  }, [userId])

  const savePlan = async () => {
    setSaving(true)
    await fetch(`${API}/home/meal-plan/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, ...plan }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = (day, val) => setPlan(prev => ({ ...prev, [day]: val }))

  const DAY_DATES = DAYS.map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{t('home.meals_week')}: <span className="text-zinc-300">{weekStart}</span></p>
        <button onClick={savePlan} disabled={saving} className="btn-primary text-sm">
          {saving ? t('home.btn_saving') : saved ? '✓ ' + t('home.meals_saved') : t('home.meals_btn_save')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DAYS.map((day, i) => (
          <div key={day} className="card space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-200">{t(`home.day_${day}`)}</p>
              <p className="text-2xs text-zinc-600">{DAY_DATES[i]}</p>
            </div>
            <textarea
              value={plan[day]}
              onChange={e => update(day, e.target.value)}
              placeholder={t('home.meals_placeholder')}
              rows={3}
              className="input-field w-full text-sm resize-none"
            />
          </div>
        ))}
      </div>

      {/* Prep notes */}
      <div className="card space-y-2">
        <p className="text-sm font-medium text-zinc-200">{t('home.prep_notes')}</p>
        <textarea
          value={plan.prep_notes}
          onChange={e => update('prep_notes', e.target.value)}
          placeholder={t('home.prep_notes_placeholder')}
          rows={2}
          className="input-field w-full text-sm resize-none"
        />
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
const TABS = ['tasks', 'shopping', 'meals']
const TAB_ICONS = { tasks: HomeIcon, shopping: ShoppingCart, meals: UtensilsCrossed }

export default function Home() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)
  const [tab, setTab] = useState('tasks')

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">{t('home.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('home.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-white/[0.06]">
        {TABS.map(t2 => {
          const Icon = TAB_ICONS[t2]
          return (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t2 ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(`home.tab_${t2}`)}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {tab === 'tasks'    && <TasksTab userId={userId} />}
      {tab === 'shopping' && <ShoppingTab userId={userId} />}
      {tab === 'meals'    && <MealsTab userId={userId} />}
    </div>
  )
}
