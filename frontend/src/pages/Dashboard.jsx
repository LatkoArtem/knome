import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

function StatCard({ to, children, className = '' }) {
  return (
    <Link to={to} className={`card p-5 hover:bg-zinc-800/50 transition-colors duration-150 block group ${className}`}>
      {children}
    </Link>
  )
}

function InsightItem({ insight }) {
  const domainColors = {
    learning: 'text-blue-400 bg-blue-400/10',
    finance:  'text-emerald-400 bg-emerald-400/10',
    health:   'text-rose-400 bg-rose-400/10',
  }
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0 animate-fade-in">
      <span className="text-base mt-0.5">{insight.domains?.length >= 2 ? '✨' : '📊'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 leading-snug">{insight.text}</p>
        {insight.domains?.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {insight.domains.map(d => (
              <span key={d} className={`badge ${domainColors[d] || 'text-zinc-400 bg-zinc-400/10'}`}>{d}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const BURNOUT_STYLE = {
  low:    { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-400/10', label: 'Низький' },
  medium: { bar: 'bg-amber-500',   text: 'text-amber-400',   badge: 'text-amber-400 bg-amber-400/10',   label: 'Середній' },
  high:   { bar: 'bg-red-500',     text: 'text-red-400',     badge: 'text-red-400 bg-red-400/10',       label: 'Високий' },
}

export default function Dashboard() {
  const userId = useStore((s) => s.userId)
  const userName = useStore((s) => s.userName)
  const [learning, setLearning] = useState(null)
  const [finance, setFinance] = useState(null)
  const [health, setHealth] = useState(null)
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [burnout, setBurnout] = useState(null)
  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    if (!userId) return
    const get = (path, cb) => fetch(`${API}${path}`).then(r => r.ok ? r.json() : null).then(cb).catch(() => {})
    get(`/learning/summary/${userId}`, setLearning)
    get(`/finance/summary/${userId}`, setFinance)
    get(`/health-domain/summary/${userId}`, setHealth)
    get(`/ml/burnout/${userId}`, setBurnout)
    get(`/ml/forecast/${userId}`, setForecast)
    setInsightsLoading(true)
    get(`/insights/${userId}`, (data) => { setInsights(data?.insights ?? []); setInsightsLoading(false) })
  }, [userId])

  const bs = burnout ? BURNOUT_STYLE[burnout.level] || BURNOUT_STYLE.low : null

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
          {userName ? `Привіт, ${userName} 👋` : 'Дашборд'}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Твій особистий AI-огляд</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-auto">

        {/* Learning — spans 1 col */}
        <StatCard to="/learning">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Навчання</span>
            <span className="text-base">📚</span>
          </div>
          {learning ? (
            <>
              <div className="stat-value">{learning.sessions_this_week}
                <span className="text-sm font-normal text-zinc-500 ml-1.5">сесій</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{learning.total_minutes} хв · {learning.goals?.length ?? 0} цілей</p>
            </>
          ) : (
            <p className="text-sm text-zinc-600">Дані відсутні</p>
          )}
        </StatCard>

        {/* Finance — spans 1 col */}
        <StatCard to="/finance">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Фінанси</span>
            <span className="text-base">💰</span>
          </div>
          {finance ? (
            <>
              <div className="stat-value">{finance.total_spent?.toFixed(0)}
                <span className="text-sm font-normal text-zinc-500 ml-1.5">{finance.currency}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{finance.recent_transactions?.length ?? 0} транзакцій</p>
              {finance.by_category && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {Object.entries(finance.by_category).slice(0, 3).map(([cat]) => (
                    <span key={cat} className="badge bg-zinc-800 text-zinc-400">{cat}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-600">Дані відсутні</p>
          )}
        </StatCard>

        {/* Health — spans 1 col */}
        <StatCard to="/health" className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Здоров'я</span>
            <span className="text-base">❤️</span>
          </div>
          {health && (health.avg_mood_7d || health.avg_sleep_7d) ? (
            <>
              <div className="flex items-end gap-4">
                <div>
                  <div className="stat-value">{health.avg_mood_7d ?? '—'}<span className="text-sm font-normal text-zinc-500">/10</span></div>
                  <p className="text-xs text-zinc-500 mt-0.5">Настрій</p>
                </div>
                <div>
                  <div className="stat-value">{health.avg_sleep_7d ?? '—'}<span className="text-sm font-normal text-zinc-500">г</span></div>
                  <p className="text-xs text-zinc-500 mt-0.5">Сон</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-2">{health.checkin_count ?? 0} check-in за тиждень</p>
            </>
          ) : (
            <p className="text-sm text-zinc-600">Дані відсутні</p>
          )}
        </StatCard>

        {/* Burnout — spans full on sm, 2 cols on lg */}
        <div className="card p-5 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔋</span>
              <span className="section-label">Ризик вигорання</span>
            </div>
            {bs && (
              <span className={`badge ${bs.badge} font-semibold`}>{bs.label} · {burnout.score}/100</span>
            )}
          </div>
          {burnout ? (
            <>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${bs.bar}`} style={{ width: `${burnout.score}%` }} />
              </div>
              {burnout.recommendations?.[0] && (
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{burnout.recommendations[0]}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-600">Потрібні check-ini для аналізу</p>
          )}
        </div>

        {/* Forecast */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📈</span>
            <span className="section-label">Прогноз витрат (30 дн.)</span>
          </div>
          {forecast && forecast.model !== 'insufficient_data' ? (
            <>
              <div className="stat-value">{forecast.total_projected_30d?.toFixed(0)}
                <span className="text-sm font-normal text-zinc-500 ml-1.5">{forecast.currency}</span>
              </div>
              <div className="mt-2 space-y-1">
                {(forecast.categories ?? []).slice(0, 3).map(c => (
                  <div key={c.category} className="flex justify-between text-xs">
                    <span className="text-zinc-500 capitalize">{c.category}</span>
                    <span className="text-zinc-400 font-medium">{c.projected_30d?.toFixed(0)}</span>
                  </div>
                ))}
              </div>
              {forecast.warning && <p className="text-[10px] text-amber-500/80 mt-2">{forecast.warning}</p>}
            </>
          ) : (
            <p className="text-sm text-zinc-600">{forecast?.warning || 'Потрібно більше транзакцій'}</p>
          )}
        </div>

        {/* Insights — full width */}
        <div className="card p-5 sm:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🧠</span>
            <span className="section-label">AI Інсайти</span>
          </div>
          {insightsLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
              Аналізую твої дані...
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0">
              {insights.map((ins, i) => <InsightItem key={i} insight={ins} />)}
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Збери більше даних для перших інсайтів</p>
          )}
        </div>
      </div>
    </div>
  )
}
