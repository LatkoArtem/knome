import { useEffect, useState } from 'react'
import { Users, Plus, X, Trash2, Cake } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const REL_TYPES = ['friend', 'family', 'colleague', 'mentor']

const TYPE_COLORS = {
  friend:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  family:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  colleague:'bg-amber-500/10 text-amber-400 border-amber-500/20',
  mentor:   'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

export default function Relationships() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)

  const [contacts, setContacts]   = useState([])
  const [summary, setSummary]     = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [name, setName]           = useState('')
  const [relType, setRelType]     = useState('friend')
  const [birthday, setBirthday]   = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)

  const load = () => {
    if (!userId) return
    fetch(`${API}/relationships/contacts/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setContacts(d?.contacts || [])).catch(() => {})
    fetch(`${API}/relationships/summary/${userId}`)
      .then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {})
  }
  useEffect(() => { load() }, [userId])

  const addContact = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/relationships/contact/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), relationship_type: relType, birthday, notes }),
    }).catch(() => {})
    setName(''); setBirthday(''); setNotes(''); setRelType('friend')
    setShowForm(false); setSaving(false)
    load()
  }

  const deleteContact = async (id) => {
    setDeleting(id)
    await fetch(`${API}/relationships/contact/${id}`, { method: 'DELETE' }).catch(() => {})
    setDeleting(null)
    load()
  }

  const upcomingBDs = contacts.filter(c => c.days_until_birthday !== null && c.days_until_birthday <= 30)
    .sort((a, b) => a.days_until_birthday - b.days_until_birthday)

  const typeLabel = (type) => {
    const map = { friend: t('relationships.type_friend'), family: t('relationships.type_family'), colleague: t('relationships.type_colleague'), mentor: t('relationships.type_mentor') }
    return map[type] || type
  }

  return (
    <div className="page-narrow">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="page-title">{t('relationships.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('relationships.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-1.5 shrink-0"
        >
          {showForm
            ? <><X className="w-3.5 h-3.5" />{t('relationships.btn_cancel')}</>
            : <><Plus className="w-3.5 h-3.5" />{t('relationships.btn_add')}</>
          }
        </button>
      </div>

      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-blue-400">{summary?.total_contacts ?? '—'}</p>
            <p className="text-2xs text-zinc-600 mt-1">{t('relationships.stat_total')}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-rose-400">{upcomingBDs.length}</p>
            <p className="text-2xs text-zinc-600 mt-1">{t('relationships.stat_birthdays')}</p>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card p-5 animate-fade-in">
            <div className="space-y-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addContact()}
                placeholder={t('relationships.form_name_placeholder')}
                className="input w-full"
                autoFocus
              />
              {/* Type selector */}
              <div className="flex gap-2 flex-wrap">
                {REL_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setRelType(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      relType === type
                        ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                        : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {typeLabel(type)}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="input w-full text-zinc-400"
                placeholder={t('relationships.form_birthday')}
              />
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('relationships.form_notes')}
                className="input w-full"
              />
              <div className="flex gap-2">
                <button onClick={addContact} disabled={saving || !name.trim()} className="btn-primary flex-1 py-2">
                  {saving ? t('relationships.form_btn_saving') : t('relationships.form_btn_save')}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost px-4">
                  {t('relationships.btn_cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming birthdays */}
        {upcomingBDs.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <p className="section-label">{t('relationships.birthdays_title')}</p>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {upcomingBDs.map((c, i) => (
                <li key={c.id || i} className="flex items-center gap-3 px-5 py-3">
                  <Cake className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="flex-1 text-sm text-zinc-300">{c.name}</span>
                  <span className="text-2xs text-rose-400 font-semibold">
                    {c.days_until_birthday === 0 ? t('relationships.today') : `${t('relationships.days_until', { days: c.days_until_birthday })}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contacts list */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="section-label">{t('relationships.contacts_title')}</p>
            <span className="text-2xs text-zinc-600 tabular-nums">{contacts.length}</span>
          </div>

          {contacts.length > 0 ? (
            <ul className="divide-y divide-white/[0.04]">
              {contacts.map((c, i) => (
                <li key={c.id || i} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/20 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-semibold text-zinc-400">
                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium truncate">{c.name}</p>
                    {c.notes && <p className="text-2xs text-zinc-600 truncate">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-2xs px-1.5 py-0.5 rounded border ${TYPE_COLORS[c.relationship_type] || 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                      {typeLabel(c.relationship_type)}
                    </span>
                    <button
                      onClick={() => deleteContact(c.id)}
                      disabled={deleting === c.id}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <Users className="w-10 h-10 text-zinc-700" />
              <p className="empty-state-title">{t('relationships.contacts_empty_title')}</p>
              <p className="empty-state-sub">{t('relationships.contacts_empty_sub')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
