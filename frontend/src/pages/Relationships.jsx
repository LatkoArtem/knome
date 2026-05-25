import { useEffect, useState } from 'react'
import { Users, Plus, X, Trash2, Cake, ChevronDown, ChevronUp, Phone, MessageSquare, Coffee, MoreHorizontal } from 'lucide-react'
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

const ITYPE_ICONS = {
  call:    <Phone className="w-3 h-3" />,
  message: <MessageSquare className="w-3 h-3" />,
  meeting: <Coffee className="w-3 h-3" />,
  other:   <MoreHorizontal className="w-3 h-3" />,
  general: <MoreHorizontal className="w-3 h-3" />,
}

export default function Relationships() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)

  const [contacts, setContacts]         = useState([])
  const [summary, setSummary]           = useState(null)
  const [showForm, setShowForm]         = useState(false)
  const [name, setName]                 = useState('')
  const [relType, setRelType]           = useState('friend')
  const [birthday, setBirthday]         = useState('')
  const [notes, setNotes]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(null)

  // Interaction state
  const [expandedId, setExpandedId]     = useState(null)
  const [interactions, setInteractions] = useState({}) // contactId → []
  const [iNote, setINote]               = useState('')
  const [iType, setIType]               = useState('general')
  const [iSaving, setISaving]           = useState(false)
  const [iLoading, setILoading]         = useState(null)

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
    if (expandedId === id) setExpandedId(null)
    load()
  }

  const loadInteractions = async (contactId) => {
    setILoading(contactId)
    const data = await fetch(`${API}/relationships/interactions/${userId}/${contactId}?limit=5`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
    setInteractions(prev => ({ ...prev, [contactId]: data?.interactions || [] }))
    setILoading(null)
  }

  const toggleExpand = (contactId) => {
    if (expandedId === contactId) {
      setExpandedId(null)
    } else {
      setExpandedId(contactId)
      setINote('')
      setIType('general')
      if (!interactions[contactId]) loadInteractions(contactId)
    }
  }

  const saveInteraction = async (contactId) => {
    if (!iNote.trim() || iSaving) return
    setISaving(true)
    await fetch(`${API}/relationships/interaction/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId, note: iNote.trim(), interaction_type: iType }),
    }).catch(() => {})
    setINote('')
    setIType('general')
    setISaving(false)
    loadInteractions(contactId)
  }

  const upcomingBDs = contacts
    .filter(c => c.days_until_birthday !== null && c.days_until_birthday <= 30)
    .sort((a, b) => a.days_until_birthday - b.days_until_birthday)

  const typeLabel = (type) => {
    const map = {
      friend:   t('relationships.type_friend'),
      family:   t('relationships.type_family'),
      colleague:t('relationships.type_colleague'),
      mentor:   t('relationships.type_mentor'),
    }
    return map[type] || type
  }

  const itypeLabel = (itype) => {
    const map = {
      call:    t('relationships.interaction_type_call'),
      message: t('relationships.interaction_type_message'),
      meeting: t('relationships.interaction_type_meeting'),
      other:   t('relationships.interaction_type_other'),
      general: t('relationships.interaction_type_other'),
    }
    return map[itype] || itype
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
                    {c.days_until_birthday === 0
                      ? t('relationships.today')
                      : t('relationships.days_until', { days: c.days_until_birthday })}
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
              {contacts.map((c, i) => {
                const isExpanded = expandedId === c.id
                const contactInteractions = interactions[c.id] || []

                return (
                  <li key={c.id || i} className="divide-y divide-white/[0.04]">
                    {/* Contact row */}
                    <div
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/20 transition-colors group cursor-pointer"
                      onClick={() => toggleExpand(c.id)}
                    >
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
                          onClick={e => { e.stopPropagation(); deleteContact(c.id) }}
                          disabled={deleting === c.id}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
                          : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="px-5 py-4 bg-zinc-900/40 space-y-4 animate-fade-in">
                        {/* Interaction history */}
                        <div>
                          <p className="text-2xs text-zinc-500 uppercase tracking-wider mb-2">
                            {t('relationships.last_contact')}
                          </p>
                          {iLoading === c.id ? (
                            <div className="space-y-2">
                              {[1,2].map(n => <div key={n} className="skeleton h-8 rounded-lg" />)}
                            </div>
                          ) : contactInteractions.length > 0 ? (
                            <ul className="space-y-2">
                              {contactInteractions.slice(0, 3).map((it, idx) => (
                                <li key={it.id || idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-zinc-600 mt-0.5 shrink-0">
                                    {ITYPE_ICONS[it.interaction_type] || ITYPE_ICONS.other}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-zinc-300 text-xs leading-relaxed line-clamp-2">{it.note}</p>
                                    <p className="text-2xs text-zinc-600 mt-0.5">{it.date} · {itypeLabel(it.interaction_type)}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-2xs text-zinc-600 italic">{t('relationships.interactions_empty')}</p>
                          )}
                        </div>

                        {/* Log new interaction */}
                        <div className="space-y-2">
                          <textarea
                            value={iNote}
                            onChange={e => setINote(e.target.value)}
                            placeholder={t('relationships.interaction_placeholder')}
                            rows={2}
                            className="input w-full resize-none text-sm"
                            onClick={e => e.stopPropagation()}
                          />
                          <div className="flex gap-2">
                            <select
                              value={iType}
                              onChange={e => setIType(e.target.value)}
                              className="input text-sm flex-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="general">{t('relationships.interaction_type_other')}</option>
                              <option value="call">{t('relationships.interaction_type_call')}</option>
                              <option value="message">{t('relationships.interaction_type_message')}</option>
                              <option value="meeting">{t('relationships.interaction_type_meeting')}</option>
                            </select>
                            <button
                              onClick={e => { e.stopPropagation(); saveInteraction(c.id) }}
                              disabled={iSaving || !iNote.trim()}
                              className="btn-primary px-4 text-sm shrink-0"
                            >
                              {iSaving ? t('relationships.interaction_btn_saving') : t('relationships.interaction_btn_save')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
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
