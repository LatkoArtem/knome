import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Wallet, Heart, Battery, TrendingUp, Brain, FileText, RefreshCw, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

/* ── Skeleton ──────────────────────────────────────────────── */
function Skel({ w = 'w-full', h = 'h-4' }) {
  return <div className={`skeleton ${w} ${h} rounded`} />
}

/* ── Stat Card (clickable, domain-accented) ──────────────────── */
function StatCard({ to, accentClass = '', Icon, iconBg, iconColor, label, children }) {
  return (
    <Link
      to={to}
      className={`card-interactive group relative overflow-hidden p-5 flex flex-col gap-3 ${accentClass}`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
      </div>
      <div>
        <p className="section-label mb-1.5">{label}</p>
        {children}
      </div>
    </Link>
  )
}

/* ── Insight item ───────────────────────────────────────────── */
const DOMAIN_PILL = {
  learning: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  finance:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  health:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

function InsightItem({ insight }) {
  const domains = insight.domains ?? []
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0 animate-fade-in">
      <span className="text-sm mt-0.5 shrink-0">
        {domains.length >= 2 ? '✨' : '◈'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 leading-snug">{insight.text}</p>
        {domains.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {domains.map(d => (
              <span key={d} className={`badge ${DOMAIN_PILL[d] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Burnout level config ───────────────────────────────────── */
const BURNOUT_STYLES = {
  low:    { bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  medium: { bar: 'bg-amber-500',   badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'       },
  high:   { bar: 'bg-red-500',     badge: 'bg-red-500/10 text-red-400 border-red-500/20'             },
}

/* ═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { t } = useTranslation()
  const userId   = useStore((s) => s.userId)
  const userName = useStore((s) => s.userName)

  const [learning, setLearning] = useState(null)
  const [finance,  setFinance]  = useState(null)
  const [health,   setHealth]   = useState(null)
  const [insights, setInsights] = useState(null)
  const [insLoading, setInsLoading] = useState(false)
  const [burnout,  setBurnout]  = useState(null)
  const [forecast, setForecast] = useState(null)
  const [report,   setReport]   = useState(null)
  const [repLoading, setRepLoading] = useState(false)
  const [loading,  setLoading]  = useState(true)   // initial load flag

  const generateReport = async () => {
    setRepLoading(true)
    try {
      const res  = await fetch(`${API}/report/weekly/${userId}`, { method: 'POST' })
      const data = await res.json()
      setReport(data?.report || null)
    } catch { setReport(null) }
    finally { setRepLoading(false) }
  }

  useEffect(() => {
    if (!userId) return
    const get = (path, cb) =>
      fetch(`${API}${path}`).then(r => r.ok ? r.json() : null).then(cb).catch(() => {})

    Promise.all([
      get(`/learning/summary/${userId}`, setLearning),
      get(`/finance/summary/${userId}`,  setFinance),
      get(`/health-domain/summary/${userId}`, setHealth),
      get(`/ml/burnout/${userId}`,  setBurnout),
      get(`/ml/forecast/${userId}`, setForecast),
    ]).finally(() => setLoading(false))

    setInsLoading(true)
    get(`/insights/${userId}`, (data) => {
      setInsights(data?.insights ?? [])
      setInsLoading(false)
    })
  }, [userId])

  const bs = burnout ? BURNOUT_STYLES[burnout.level] ?? BURNOUT_STYLES.low : null
  const greeting = userName ? t('dashboard.greeting', { name: userName }) : t('dashboard.title')

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="page-title">{greeting}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        {/* Learning */}
        <StatCard to="/learning" accentClass="accent-learning"
          Icon={BookOpen} iconBg="bg-indigo-500/15" iconColor="text-indigo-400"
          label={t('dashboard.card_learning')}>
          {loading ? <><Skel h="h-7 mb-1.5" w="w-16" /><Skel h="h-3" w="w-28" /></>
          : learning ? (
            <>
              <div className="stat-value-sm">{learning.sessions_this_week}
                <span className="text-xs font-normal text-zinc-500 ml-1.5">{t('dashboard.unit_sessions')}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {learning.total_minutes} {t('dashboard.unit_min')} · {learning.goals?.length ?? 0} {t('dashboard.unit_goals')}
              </p>
            </>
          ) : <p className="text-sm text-zinc-600">{t('dashboard.no_data')}</p>}
        </StatCard>

        {/* Finance */}
        <StatCard to="/finance" accentClass="accent-finance"
          Icon={Wallet} iconBg="bg-emerald-500/15" iconColor="text-emerald-400"
          label={t('dashboard.card_finance')}>
          {loading ? <><Skel h="h-7 mb-1.5" w="w-24" /><Skel h="h-3" w="w-20" /></>
          : finance ? (
            <>
              <div className="stat-value-sm">{finance.total_spent?.toFixed(0)}
                <span className="text-xs font-normal text-zinc-500 ml-1.5">{finance.currency}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{finance.recent_transactions?.length ?? 0} {t('dashboard.unit_tx')}</p>
              {finance.by_category && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {Object.entries(finance.by_category).slice(0, 3).map(([cat]) => (
                    <span key={cat} className="badge bg-zinc-800 text-zinc-400 border-zinc-700">{cat}</span>
                  ))}
                </div>
              )}
            </>
          ) : <p className="text-sm text-zinc-600">{t('dashboard.no_data')}</p>}
        </StatCard>

        {/* Health */}
        <StatCard to="/health" accentClass="accent-health sm:col-span-2 lg:col-span-1"
          Icon={Heart} iconBg="bg-rose-500/15" iconColor="text-rose-400"
          label={t('dashboard.card_health')}>
          {loading ? <><Skel h="h-7 mb-1.5" w="w-28" /><Skel h="h-3" w="w-20" /></>
          : health && (health.avg_mood_7d || health.avg_sleep_7d) ? (
            <>
              <div className="flex items-baseline gap-4">
                <div>
                  <span className="stat-value-sm">{health.avg_mood_7d ?? '—'}</span>
                  <span className="text-xs text-zinc-500">/10</span>
                  <p className="text-2xs text-zinc-600 mt-0.5">{t('dashboard.label_mood')}</p>
                </div>
                <div>
                  <span className="stat-value-sm">{health.avg_sleep_7d ?? '—'}</span>
                  <span className="text-xs text-zinc-500">г</span>
                  <p className="text-2xs text-zinc-600 mt-0.5">{t('dashboard.label_sleep')}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-1">{health.checkin_count ?? 0} {t('dashboard.checkin_week')}</p>
            </>
          ) : <p className="text-sm text-zinc-600">{t('dashboard.no_data')}</p>}
        </StatCard>

        {/* Burnout — wide */}
        <div className="card accent-amber p-5 sm:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Battery className="w-4 h-4 text-amber-400" />
              </div>
              <p className="section-label">{t('dashboard.burnout_title')}</p>
            </div>
            {bs && (
              <span className={`badge font-semibold ${bs.badge}`}>
                {t(`dashboard.burnout_${burnout.level}`)} · {burnout.score}/100
              </span>
            )}
          </div>
          {loading ? (
            <><Skel h="h-1.5 mb-2" /><Skel h="h-3" w="w-48" /></>
          ) : burnout ? (
            <>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${bs.bar}`}
                  style={{ width: `${burnout.score}%` }}
                />
              </div>
              {burnout.recommendations?.[0] && (
                <p className="text-xs text-zinc-500 leading-relaxed">{burnout.recommendations[0]}</p>
              )}
            </>
          ) : <p className="text-sm text-zinc-600">{t('dashboard.burnout_no_data')}</p>}
        </div>

        {/* Forecast */}
        <div className="card accent-blue p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <p className="section-label">{t('dashboard.forecast_title')}</p>
          </div>
          {loading ? (
            <><Skel h="h-7 mb-1.5" w="w-20" /><Skel h="h-3 mb-1" /><Skel h="h-3" w="w-28" /></>
          ) : forecast && forecast.model !== 'insufficient_data' ? (
            <>
              <div className="stat-value-sm mb-1">
                {forecast.total_projected_30d?.toFixed(0)}
                <span className="text-xs font-normal text-zinc-500 ml-1.5">{forecast.currency}</span>
              </div>
              <div className="space-y-1.5 mt-2">
                {(forecast.categories ?? []).slice(0, 3).map(c => (
                  <div key={c.category} className="flex justify-between text-xs">
                    <span className="text-zinc-500 capitalize">{c.category}</span>
                    <span className="text-zinc-400 font-medium tabular-nums">{c.projected_30d?.toFixed(0)}</span>
                  </div>
                ))}
              </div>
              {forecast.warning && <p className="text-2xs text-amber-500/80 mt-2">{forecast.warning}</p>}
            </>
          ) : <p className="text-sm text-zinc-600">{forecast?.warning || t('dashboard.forecast_no_data')}</p>}
        </div>

        {/* Insights — full width */}
        <div className="card accent-violet p-5 sm:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-400" />
            </div>
            <p className="section-label">{t('dashboard.insights_title')}</p>
          </div>
          {insLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
              {t('dashboard.insights_loading')}
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0">
              {insights.map((ins, i) => <InsightItem key={i} insight={ins} />)}
            </div>
          ) : (
            <div className="empty-state py-6">
              <p className="empty-state-title">{t('dashboard.insights_empty_title')}</p>
              <p className="empty-state-sub">{t('dashboard.insights_empty_sub')}</p>
            </div>
          )}
        </div>

        {/* Weekly Report — full width */}
        <div className="card p-5 sm:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                <FileText className="w-4 h-4 text-sky-400" />
              </div>
              <p className="section-label">{t('dashboard.report_title')}</p>
            </div>
            <button onClick={generateReport} disabled={repLoading} className="btn-outline text-xs px-3 py-1.5">
              {repLoading
                ? <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />{t('dashboard.report_generating')}</span>
                : report ? t('dashboard.report_refresh') : t('dashboard.report_generate')
              }
            </button>
          </div>
          {report ? (
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap animate-fade-in">{report}</p>
          ) : (
            <p className="text-sm text-zinc-600">{t('dashboard.report_hint')}</p>
          )}
        </div>

      </div>
    </div>
  )
}
