import { useEffect, useState, useRef } from 'react'
import { CheckSquare, Square, Plus, X, Play, Pause, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const PRIORITY_COLORS = { 5: 'text-red-400', 4: 'text-orange-400', 3: 'text-yellow-500', 2: 'text-blue-400', 1: 'text-zinc-500' }
const PRIORITY_BG     = { 5: 'bg-red-500/8 border-red-500/20', 4: 'bg-orange-500/8 border-orange-500/20', 3: 'bg-yellow-500/8 border-yellow-500/20', 2: 'bg-blue-500/8 border-blue-500/20', 1: 'bg-zinc-800 border-zinc-700' }

/* ─── Pomodoro timer ────────────────────────────────────────── */
function PomodoroTimer({ onComplete, tasks = [], selectedTaskId, onSelectTask }) {
  const { t } = useTranslation()
  const [mode, setMode]       = useState('work')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const intervalRef           = useRef(null)

  const DURATIONS = { work: 25 * 60, break: 5 * 60 }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            const isFocus = mode === 'work'
            onComplete(isFocus ? 25 : 5, isFocus)
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode])

  const reset = () => { setRunning(false); setSeconds(DURATIONS[mode]) }

  const switchMode = (m) => {
    setRunning(false)
    setMode(m)
    setSeconds(DURATIONS[m])
  }

  const handlePlay = () => setRunning(v => !v)

  const total  = DURATIONS[mode]
  const pct    = ((total - seconds) / total) * 100
  const circle = 2 * Math.PI * 44
  const offset = circle * (1 - pct / 100)
  const mins   = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs   = (seconds % 60).toString().padStart(2, '0')
  const color  = mode === 'work' ? '#7c3aed' : '#10b981'

  return (
    <div className="card p-5 accent-violet text-center">
      {/* Mode tabs */}
      <div className="flex gap-2 mb-4 justify-center">
        {(['work', 'break']).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              mode === m
                ? m === 'work' ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {m === 'work' ? t('productivity.timer_work') : t('productivity.timer_break')}
          </button>
        ))}
      </div>

      {/* Task selector */}
      {tasks.length > 0 && (
        <select
          value={selectedTaskId}
          onChange={e => onSelectTask(e.target.value)}
          className="w-full mb-4 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500 truncate"
        >
          <option value="">{t('productivity.timer_no_task')}</option>
          {tasks.map(task => (
            <option key={task.id} value={task.id}>{task.title}</option>
          ))}
        </select>
      )}

      {/* Circular progress ring */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#27272a" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circle}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-mono font-bold text-zinc-100">{mins}:{secs}</span>
          <span className="text-2xs text-zinc-600 mt-0.5">{mode === 'work' ? 'фокус' : 'перерва'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 justify-center">
        <button onClick={reset} className="btn-icon text-zinc-500 hover:text-zinc-300">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handlePlay}
          style={{ background: running ? '#3f3f46' : color }}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity"
        >
          {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="w-8" />
      </div>
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function Productivity() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)

  const [summary, setSummary]             = useState(null)
  const [tasks, setTasks]                 = useState([])
  const [doneTasks, setDoneTasks]         = useState([])
  const [showForm, setShowForm]           = useState(false)
  const [showDone, setShowDone]           = useState(false)
  const [title, setTitle]                 = useState('')
  const [priority, setPriority]           = useState(3)
  const [dueDate, setDueDate]             = useState('')
  const [saving, setSaving]               = useState(false)
  const [completing, setCompleting]       = useState(null)
  const [deleting, setDeleting]           = useState(null)
  const [selectedTaskId, setSelectedTaskId] = useState('')

  const PRIORITY_LABELS = {
    5: t('productivity.priority_critical'),
    4: t('productivity.priority_high'),
    3: t('productivity.priority_medium'),
    2: t('productivity.priority_low'),
  }

  const load = () => {
    if (!userId) return
    fetch(`${API}/productivity/summary/${userId}`)
      .then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
    fetch(`${API}/productivity/tasks/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTasks(d?.tasks || [])).catch(() => {})
    fetch(`${API}/productivity/tasks/${userId}?status=done`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDoneTasks(d?.tasks || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addTask = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/productivity/task/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), priority, due_date: dueDate }),
    }).catch(() => {})
    setSaving(false)
    setTitle('')
    setPriority(3)
    setDueDate('')
    setShowForm(false)
    load()
  }

  const completeTask = async (taskId) => {
    setCompleting(taskId)
    await fetch(`${API}/productivity/task/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    }).catch(() => {})
    setCompleting(null)
    if (selectedTaskId === taskId) setSelectedTaskId('')
    load()
  }

  const deleteTask = async (taskId) => {
    setDeleting(taskId)
    await fetch(`${API}/productivity/task/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    }).catch(() => {})
    setDeleting(null)
    if (selectedTaskId === taskId) setSelectedTaskId('')
    load()
  }

  const logPomodoro = async (duration, completed) => {
    await fetch(`${API}/productivity/pomodoro/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration, completed, task_id: selectedTaskId }),
    }).catch(() => {})
    load()
  }

  return (
    <div className="page-narrow">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="page-title">{t('productivity.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('productivity.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-1.5 shrink-0"
        >
          {showForm
            ? <><X className="w-3.5 h-3.5" />{t('productivity.btn_cancel')}</>
            : <><Plus className="w-3.5 h-3.5" />{t('productivity.btn_add')}</>
          }
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">

        {/* Stats */}
        <div className="card p-5">
          <p className="section-label mb-4">{t('productivity.stats_today')}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('productivity.stat_active'), value: summary?.active_tasks,        color: 'text-violet-400' },
              { label: t('productivity.stat_done'),   value: summary?.done_tasks,          color: 'text-emerald-400' },
              { label: t('productivity.stat_focus'),  value: summary?.focus_minutes_today, color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold leading-none ${color}`}>{value ?? '—'}</p>
                <p className="text-2xs text-zinc-600 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pomodoro */}
        <PomodoroTimer
          onComplete={logPomodoro}
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
        />

        {/* Add task form */}
        {showForm && (
          <div className="card p-5 sm:col-span-2 animate-fade-in">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">{t('productivity.form_title')}</h2>
            <div className="space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder={t('productivity.task_placeholder')}
                className="input"
                autoFocus
              />
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 4, 5].map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      priority === p
                        ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                        : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="input text-zinc-400"
              />
              <div className="flex gap-2">
                <button onClick={addTask} disabled={saving || !title.trim()} className="btn-primary flex-1 py-2">
                  {saving ? t('productivity.btn_saving') : t('productivity.btn_save')}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost px-4">
                  {t('productivity.btn_cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active task list */}
        <div className="card overflow-hidden sm:col-span-2">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="section-label">{t('productivity.tasks_title')}</p>
            <span className="text-2xs text-zinc-600 tabular-nums">{tasks.length}</span>
          </div>

          {tasks.length > 0 ? (
            <ul className="divide-y divide-white/[0.04]">
              {tasks.map((task, i) => (
                <li
                  key={task.id || i}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/20 transition-colors group"
                >
                  {/* Complete checkbox */}
                  <button
                    onClick={() => completeTask(task.id)}
                    disabled={completing === task.id}
                    className="w-5 h-5 shrink-0 rounded border border-zinc-700 hover:border-violet-500 hover:bg-violet-500/10 transition-colors flex items-center justify-center"
                  >
                    {completing === task.id
                      ? <span className="w-3 h-3 border border-violet-500/50 border-t-violet-400 rounded-full animate-spin" />
                      : <Square className="w-3 h-3 text-zinc-700 group-hover:text-violet-500" />
                    }
                  </button>

                  <span className={`flex-1 text-sm min-w-0 truncate ${selectedTaskId === task.id ? 'text-violet-300' : 'text-zinc-300'}`}>
                    {task.title}
                    {selectedTaskId === task.id && <span className="ml-1.5 text-2xs text-violet-500">●</span>}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.due_date && (
                      <span className="text-2xs text-zinc-600 tabular-nums hidden sm:block">{task.due_date?.slice(0, 10)}</span>
                    )}
                    <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_BG[task.priority]} ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {/* Delete button */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      disabled={deleting === task.id}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all ml-1"
                      aria-label="Видалити"
                    >
                      {deleting === task.id
                        ? <span className="w-3 h-3 border border-red-500/50 border-t-red-400 rounded-full animate-spin block" />
                        : <X className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <CheckSquare className="w-10 h-10 text-zinc-700" />
              <p className="empty-state-title">{t('productivity.tasks_empty_title')}</p>
              <p className="empty-state-sub">{t('productivity.tasks_empty_sub')}</p>
            </div>
          )}
        </div>

        {/* Done tasks (collapsible) */}
        {doneTasks.length > 0 && (
          <div className="card overflow-hidden sm:col-span-2">
            <button
              onClick={() => setShowDone(v => !v)}
              className="w-full px-5 py-3 border-b border-white/[0.06] flex items-center justify-between hover:bg-zinc-800/20 transition-colors"
            >
              <p className="section-label">{t('productivity.tasks_done_title')}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xs text-zinc-600 tabular-nums">{doneTasks.length}</span>
                {showDone
                  ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
                  : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                }
              </div>
            </button>
            {showDone && (
              <ul className="divide-y divide-white/[0.04]">
                {doneTasks.slice(0, 10).map((task, i) => (
                  <li key={task.id || i} className="flex items-center gap-3 px-5 py-3 opacity-50">
                    <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="flex-1 text-sm text-zinc-500 line-through min-w-0 truncate">{task.title}</span>
                    <span className="text-2xs text-zinc-700 tabular-nums hidden sm:block">{task.created_at?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
