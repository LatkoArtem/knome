import { useEffect, useState } from 'react'
import { NotebookPen, Heart, CalendarCheck, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

function StatTile({ label, value, color }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold leading-none ${color}`}>{value ?? '—'}</p>
      <p className="text-2xs text-zinc-600 mt-1">{label}</p>
    </div>
  )
}

/* ─── Journal Tab ──────────────────────────────────────────────── */
function JournalTab({ userId }) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState([])
  const [text, setText]       = useState('')
  const [mood, setMood]       = useState(5)
  const [energy, setEnergy]   = useState(5)
  const [tags, setTags]       = useState('')
  const [saving, setSaving]   = useState(false)

  const load = () => {
    fetch(`${API}/reflection/journal/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setEntries(d?.entries || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/reflection/journal/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), mood, energy, tags }),
    }).catch(() => {})
    setText(''); setTags(''); setMood(5); setEnergy(5)
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div className="card p-5 accent-amber">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('reflection.journal_placeholder')}
          className="input resize-none w-full mb-3"
          rows={4}
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-2xs text-zinc-500 mb-1">{t('reflection.journal_mood')} {mood}/10</p>
            <input type="range" min={1} max={10} value={mood} onChange={e => setMood(+e.target.value)}
              className="w-full" />
          </div>
          <div>
            <p className="text-2xs text-zinc-500 mb-1">{t('reflection.journal_energy')} {energy}/10</p>
            <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(+e.target.value)}
              className="w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder={t('reflection.journal_tags')}
            className="input flex-1 text-sm"
          />
          <button onClick={save} disabled={saving || !text.trim()} className="btn-primary px-4">
            {saving ? t('reflection.journal_btn_saving') : t('reflection.journal_btn_save')}
          </button>
        </div>
      </div>

      {/* Entries list */}
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.id || i} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs text-zinc-500 tabular-nums">{e.date}</span>
                <div className="flex gap-3 text-2xs text-zinc-600">
                  <span>{t('reflection.journal_mood')} {e.mood}/10</span>
                  <span>{t('reflection.journal_energy')} {e.energy}/10</span>
                </div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{e.text}</p>
              {e.tags && <p className="text-2xs text-zinc-600 mt-2">{e.tags}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <NotebookPen className="w-10 h-10 text-zinc-700" />
          <p className="empty-state-title">{t('reflection.journal_empty_title')}</p>
          <p className="empty-state-sub">{t('reflection.journal_empty_sub')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Gratitude Tab ────────────────────────────────────────────── */
function GratitudeTab({ userId }) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState([])
  const [items, setItems]     = useState(['', '', ''])
  const [saving, setSaving]   = useState(false)

  const load = () => {
    fetch(`${API}/reflection/gratitude/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setEntries(d?.entries || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!items[0].trim() || saving) return
    setSaving(true)
    await fetch(`${API}/reflection/gratitude/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item1: items[0], item2: items[1], item3: items[2] }),
    }).catch(() => {})
    setItems(['', '', ''])
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 accent-rose">
        <p className="section-label mb-3">{t('reflection.gratitude_title')}</p>
        <div className="space-y-2 mb-3">
          {[0, 1, 2].map(i => (
            <input
              key={i}
              value={items[i]}
              onChange={e => setItems(prev => { const n = [...prev]; n[i] = e.target.value; return n })}
              placeholder={`${i + 1}. ${t('reflection.gratitude_placeholder')}`}
              className="input w-full"
            />
          ))}
        </div>
        <button onClick={save} disabled={saving || !items[0].trim()} className="btn-primary w-full">
          {saving ? t('reflection.gratitude_btn_saving') : t('reflection.gratitude_btn_save')}
        </button>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.id || i} className="card p-4">
              <p className="text-2xs text-zinc-500 mb-2">{e.date}</p>
              <div className="space-y-1">
                {[e.item1, e.item2, e.item3].filter(Boolean).map((item, j) => (
                  <p key={j} className="text-sm text-zinc-300 flex items-start gap-2">
                    <Heart className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart className="w-10 h-10 text-zinc-700" />
          <p className="empty-state-title">{t('reflection.gratitude_empty_title')}</p>
          <p className="empty-state-sub">{t('reflection.gratitude_empty_sub')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Weekly Tab ───────────────────────────────────────────────── */
function WeeklyTab({ userId }) {
  const { t } = useTranslation()
  const [reviews, setReviews] = useState([])
  const [wins, setWins]       = useState('')
  const [challenges, setChallenges] = useState('')
  const [focus, setFocus]     = useState('')
  const [saving, setSaving]   = useState(false)

  const getWeek = () => {
    const now = new Date()
    const y = now.getFullYear()
    const start = new Date(now.getFullYear(), 0, 1)
    const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
    return `${y}-W${String(week).padStart(2, '0')}`
  }

  const load = () => {
    fetch(`${API}/reflection/weekly/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setReviews(d?.reviews || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!wins.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/reflection/weekly/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: getWeek(), wins, challenges, focus }),
    }).catch(() => {})
    setWins(''); setChallenges(''); setFocus('')
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 accent-violet">
        <p className="section-label mb-3">{getWeek()}</p>
        <div className="space-y-2 mb-3">
          <textarea
            value={wins}
            onChange={e => setWins(e.target.value)}
            placeholder={t('reflection.weekly_wins')}
            className="input resize-none w-full"
            rows={2}
          />
          <textarea
            value={challenges}
            onChange={e => setChallenges(e.target.value)}
            placeholder={t('reflection.weekly_challenges')}
            className="input resize-none w-full"
            rows={2}
          />
          <textarea
            value={focus}
            onChange={e => setFocus(e.target.value)}
            placeholder={t('reflection.weekly_focus')}
            className="input resize-none w-full"
            rows={2}
          />
        </div>
        <button onClick={save} disabled={saving || !wins.trim()} className="btn-primary w-full">
          {saving ? t('reflection.weekly_btn_saving') : t('reflection.weekly_btn_save')}
        </button>
      </div>

      {reviews.length > 0 ? (
        <div className="space-y-2">
          {reviews.map((r, i) => (
            <div key={r.id || i} className="card p-4">
              <p className="text-2xs text-zinc-500 mb-2 font-mono">{r.week}</p>
              {r.wins && <p className="text-sm text-zinc-300 mb-1"><span className="text-emerald-400 text-2xs mr-2">{t('reflection.label_wins')}</span>{r.wins}</p>}
              {r.challenges && <p className="text-sm text-zinc-400 mb-1"><span className="text-amber-400 text-2xs mr-2">{t('reflection.label_challenges')}</span>{r.challenges}</p>}
              {r.focus && <p className="text-sm text-violet-300"><span className="text-violet-400 text-2xs mr-2">{t('reflection.label_focus')}</span>{r.focus}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <CalendarCheck className="w-10 h-10 text-zinc-700" />
          <p className="empty-state-title">{t('reflection.weekly_empty_title')}</p>
          <p className="empty-state-sub">{t('reflection.weekly_empty_sub')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function Reflection() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)
  const [tab, setTab]       = useState('journal')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/reflection/summary/${userId}`)
      .then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
  }, [userId])

  const TABS = [
    { id: 'journal',   label: t('reflection.tab_journal'),   Icon: NotebookPen },
    { id: 'gratitude', label: t('reflection.tab_gratitude'), Icon: Heart        },
    { id: 'weekly',    label: t('reflection.tab_weekly'),    Icon: CalendarCheck },
  ]

  return (
    <div className="page-narrow">
      <div className="mb-6">
        <h1 className="page-title">{t('reflection.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('reflection.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label={t('reflection.stat_journal')}   value={summary?.journal_count}    color="text-amber-400" />
          <StatTile label={t('reflection.stat_gratitude')} value={summary?.gratitude_streak} color="text-rose-400"  />
          <StatTile label={t('reflection.stat_reviews')}   value={summary?.reviews_count ?? 0}  color="text-violet-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-900 p-1 rounded-xl border border-white/[0.06]">
        {TABS.map(({ id, label, Icon }) => (
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

      {tab === 'journal'   && <JournalTab   userId={userId} />}
      {tab === 'gratitude' && <GratitudeTab userId={userId} />}
      {tab === 'weekly'    && <WeeklyTab    userId={userId} />}
    </div>
  )
}
