import { useEffect, useState } from 'react'
import { Briefcase, Trophy, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const SKILL_CATEGORIES = ['technical', 'soft', 'management', 'design', 'data', 'general']

const LEVEL_COLORS = [
  '', 'bg-zinc-700', 'bg-zinc-600', 'bg-blue-900', 'bg-blue-700', 'bg-blue-600',
  'bg-violet-700', 'bg-violet-600', 'bg-amber-700', 'bg-amber-500', 'bg-emerald-500',
]

const IMPACT_COLORS = {
  low:    'text-zinc-500 border-zinc-700',
  medium: 'text-amber-400 border-amber-500/30',
  high:   'text-emerald-400 border-emerald-500/30',
}

function SkillBar({ level }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${i < level ? LEVEL_COLORS[level] || 'bg-violet-600' : 'bg-zinc-800'}`}
        />
      ))}
    </div>
  )
}

/* ─── Skills Tab ───────────────────────────────────────────────── */
function SkillsTab({ userId }) {
  const { t } = useTranslation()
  const [skills, setSkills]       = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [name, setName]           = useState('')
  const [level, setLevel]         = useState(5)
  const [category, setCategory]   = useState('general')
  const [saving, setSaving]       = useState(false)

  const load = () => {
    fetch(`${API}/career/skills/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSkills(d?.skills || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addSkill = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/career/skill/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), level, category }),
    }).catch(() => {})
    setName(''); setLevel(5); setCategory('general')
    setShowForm(false); setSaving(false)
    load()
  }

  const updateLevel = async (skillId, newLevel) => {
    await fetch(`${API}/career/skill/${skillId}/level`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: newLevel }),
    }).catch(() => {})
    load()
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(v => !v)}
        className="btn-primary flex items-center gap-1.5 w-full justify-center"
      >
        {showForm ? <><X className="w-3.5 h-3.5" />{t('career.btn_cancel')}</> : <><Plus className="w-3.5 h-3.5" />{t('career.btn_add_skill')}</>}
      </button>

      {showForm && (
        <div className="card p-5 animate-fade-in">
          <div className="space-y-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              placeholder={t('career.skill_name_placeholder')}
              className="input w-full"
              autoFocus
            />
            <div>
              <p className="text-2xs text-zinc-500 mb-1">{t('career.skill_level')}: {level}/10</p>
              <input type="range" min={1} max={10} value={level} onChange={e => setLevel(+e.target.value)}
                className="w-full" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SKILL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    category === cat
                      ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button onClick={addSkill} disabled={saving || !name.trim()} className="btn-primary w-full py-2">
              {saving ? t('career.skill_btn_saving') : t('career.skill_btn_save')}
            </button>
          </div>
        </div>
      )}

      {skills.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {skills.map((s, i) => (
            <div key={s.id || i} className="card p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-semibold text-zinc-200">{s.name}</p>
                <span className="text-xs text-zinc-500 font-mono ml-2 shrink-0">{s.level}/10</span>
              </div>
              <SkillBar level={s.level} />
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xs text-zinc-600">{s.category}</span>
                <div className="flex gap-1">
                  {[Math.max(1, s.level - 1), Math.min(10, s.level + 1)].map((newLvl, j) => (
                    <button
                      key={j}
                      onClick={() => updateLevel(s.id, newLvl)}
                      className="text-2xs text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      {j === 0 ? '−' : '+'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Briefcase className="w-10 h-10 text-zinc-700" />
          <p className="empty-state-title">{t('career.skills_empty_title')}</p>
          <p className="empty-state-sub">{t('career.skills_empty_sub')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Achievements Tab ─────────────────────────────────────────── */
function AchievementsTab({ userId }) {
  const { t } = useTranslation()
  const [achievements, setAchievements] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [impact, setImpact]       = useState('medium')
  const [saving, setSaving]       = useState(false)

  const load = () => {
    fetch(`${API}/career/achievements/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setAchievements(d?.achievements || [])).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addAchievement = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/career/achievement/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: desc, impact }),
    }).catch(() => {})
    setTitle(''); setDesc(''); setImpact('medium')
    setShowForm(false); setSaving(false)
    load()
  }

  const impactLabel = (v) => ({ low: t('career.impact_low'), medium: t('career.impact_medium'), high: t('career.impact_high') }[v] || v)

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(v => !v)}
        className="btn-primary flex items-center gap-1.5 w-full justify-center"
      >
        {showForm ? <><X className="w-3.5 h-3.5" />{t('career.btn_cancel')}</> : <><Plus className="w-3.5 h-3.5" />{t('career.btn_add_achievement')}</>}
      </button>

      {showForm && (
        <div className="card p-5 animate-fade-in">
          <div className="space-y-3">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAchievement()}
              placeholder={t('career.achievement_title_placeholder')}
              className="input w-full"
              autoFocus
            />
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={t('career.achievement_desc')}
              className="input resize-none w-full"
              rows={2}
            />
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(v => (
                <button
                  key={v}
                  onClick={() => setImpact(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    impact === v
                      ? `border-amber-500/50 bg-amber-600/20 text-amber-300`
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {impactLabel(v)}
                </button>
              ))}
            </div>
            <button onClick={addAchievement} disabled={saving || !title.trim()} className="btn-primary w-full py-2">
              {saving ? t('career.achievement_btn_saving') : t('career.achievement_btn_save')}
            </button>
          </div>
        </div>
      )}

      {achievements.length > 0 ? (
        <div className="space-y-2">
          {achievements.map((a, i) => (
            <div key={a.id || i} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-200">{a.title}</p>
                    {a.description && <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>}
                  </div>
                </div>
                <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${IMPACT_COLORS[a.impact] || IMPACT_COLORS.medium}`}>
                  {impactLabel(a.impact)}
                </span>
              </div>
              {a.date && <p className="text-2xs text-zinc-700 mt-2 ml-6">{a.date}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Trophy className="w-10 h-10 text-zinc-700" />
          <p className="empty-state-title">{t('career.achievements_empty_title')}</p>
          <p className="empty-state-sub">{t('career.achievements_empty_sub')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function Career() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)
  const [tab, setTab]       = useState('skills')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/career/summary/${userId}`)
      .then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
  }, [userId])

  const topLevel = summary?.top_skills?.[0]?.level ?? null

  return (
    <div className="page-narrow">
      <div className="mb-6">
        <h1 className="page-title">{t('career.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('career.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('career.stat_skills'),       value: summary?.total_skills,       color: 'text-violet-400' },
            { label: t('career.stat_achievements'),  value: summary?.total_achievements, color: 'text-amber-400'  },
            { label: t('career.stat_top'),           value: topLevel ? `${topLevel}/10` : null, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-2xl font-bold leading-none ${color}`}>{value ?? '—'}</p>
              <p className="text-2xs text-zinc-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-900 p-1 rounded-xl border border-white/[0.06]">
        {[
          { id: 'skills',       label: t('career.tab_skills'),       Icon: Briefcase },
          { id: 'achievements', label: t('career.tab_achievements'), Icon: Trophy    },
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

      {tab === 'skills'       && <SkillsTab       userId={userId} />}
      {tab === 'achievements' && <AchievementsTab userId={userId} />}
    </div>
  )
}
