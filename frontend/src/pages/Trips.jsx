import { useEffect, useState } from 'react'
import { Plane, Plus, X, MapPin, Calendar, Wallet, CheckCircle2, Clock, Luggage } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const CURRENCIES = ['UAH', 'USD', 'EUR', 'GBP', 'PLN']

const STATUS_STYLES = {
  planned:  { label: 'trips.status_planned',  cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  ongoing:  { label: 'trips.status_ongoing',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  done:     { label: 'trips.status_done',     cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

const NEXT_STATUS = { planned: 'ongoing', ongoing: 'done' }

function fmt(n, cur) {
  if (!n) return ''
  return Number(n).toLocaleString('uk-UA', { maximumFractionDigits: 0 }) + ' ' + cur
}

function dateRange(ds, de) {
  if (!ds && !de) return null
  if (!de) return ds
  return `${ds} → ${de}`
}

function StatCard({ label, value, color = 'text-zinc-100' }) {
  return (
    <div className="card text-center py-4">
      <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
      <p className="text-2xs text-zinc-500 mt-1">{label}</p>
    </div>
  )
}

export default function Trips() {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)

  const [trips, setTrips]         = useState([])
  const [upcoming, setUpcoming]   = useState(0)
  const [done, setDone]           = useState(0)
  const [showForm, setShowForm]   = useState(false)
  const [destination, setDest]    = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd]     = useState('')
  const [budget, setBudget]       = useState('')
  const [currency, setCurrency]   = useState('UAH')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [filter, setFilter]       = useState('all')   // all | planned | ongoing | done

  const load = () => {
    fetch(`${API}/trips/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setTrips(d.trips)
          setUpcoming(d.upcoming)
          setDone(d.done)
        }
      })
      .catch(() => {})
  }

  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!destination.trim() || saving) return
    setSaving(true)
    await fetch(`${API}/trips/trip/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: destination.trim(),
        date_start: dateStart,
        date_end: dateEnd,
        budget: parseFloat(budget) || 0,
        currency,
        notes,
      }),
    })
    setSaving(false)
    setDest(''); setDateStart(''); setDateEnd('')
    setBudget(''); setNotes(''); setShowForm(false)
    load()
  }

  const advanceStatus = async (trip) => {
    const next = NEXT_STATUS[trip.status]
    if (!next) return
    await fetch(`${API}/trips/trip/${trip.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    load()
  }

  const del = async (id) => {
    await fetch(`${API}/trips/trip/${id}`, { method: 'DELETE' })
    load()
  }

  const visible = filter === 'all' ? trips : trips.filter(t => t.status === filter)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">{t('trips.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('trips.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('trips.stat_total')}    value={trips.length} />
        <StatCard label={t('trips.stat_upcoming')} value={upcoming} color="text-blue-400" />
        <StatCard label={t('trips.stat_done')}     value={done}     color="text-emerald-400" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-0.5 border border-white/[0.06]">
          {['all', 'planned', 'ongoing', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === f ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t(`trips.filter_${f}`)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm shrink-0">
          <Plus className="w-4 h-4" /> {t('trips.btn_add')}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card space-y-3">
          <p className="font-medium text-sm text-zinc-200">{t('trips.form_title')}</p>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              value={destination}
              onChange={e => setDest(e.target.value)}
              placeholder={t('trips.dest_placeholder')}
              className="input-field flex-1 text-sm"
              onKeyDown={e => e.key === 'Enter' && save()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-2xs text-zinc-500 mb-1 block">{t('trips.date_start')}</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="text-2xs text-zinc-500 mb-1 block">{t('trips.date_end')}</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                className="input-field w-full text-sm" />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-2xs text-zinc-500 mb-1 block">{t('trips.budget')}</label>
              <input
                type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)}
                placeholder="0"
                className="input-field w-full text-sm"
              />
            </div>
            <div className="w-28">
              <label className="text-2xs text-zinc-500 mb-1 block">{t('trips.currency')}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-field w-full text-sm">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={t('trips.notes_placeholder')}
            rows={2}
            className="input-field w-full text-sm resize-none"
          />

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">{t('trips.btn_cancel')}</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? t('trips.btn_saving') : t('trips.btn_save')}
            </button>
          </div>
        </div>
      )}

      {/* Trip list */}
      {visible.length === 0 ? (
        <div className="card text-center py-12">
          <Plane className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium text-sm">{t('trips.empty_title')}</p>
          <p className="text-zinc-600 text-xs mt-1">{t('trips.empty_sub')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(trip => {
            const st = STATUS_STYLES[trip.status] || STATUS_STYLES.planned
            const range = dateRange(trip.date_start, trip.date_end)
            const canAdvance = !!NEXT_STATUS[trip.status]

            return (
              <div key={trip.id} className="card group">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    {trip.status === 'done'
                      ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                      : trip.status === 'ongoing'
                      ? <Luggage className="w-4.5 h-4.5 text-amber-400" />
                      : <Plane className="w-4.5 h-4.5 text-blue-400" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-100">{trip.destination}</p>
                      <span className={`text-2xs font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>
                        {t(st.label)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {range && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Calendar className="w-3 h-3" /> {range}
                        </span>
                      )}
                      {trip.budget > 0 && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Wallet className="w-3 h-3" /> {fmt(trip.budget, trip.currency)}
                        </span>
                      )}
                    </div>

                    {trip.notes && (
                      <p className="text-xs text-zinc-600 mt-1.5 line-clamp-2">{trip.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canAdvance && (
                      <button
                        onClick={() => advanceStatus(trip)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-500 hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20"
                        title={t('trips.btn_advance')}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => del(trip.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
