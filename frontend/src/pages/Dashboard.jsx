import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const DOMAIN_STYLES = {
  learning: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  finance:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  health:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

const DOMAIN_LABELS = { learning: '📚', finance: '💰', health: '❤️' }

function StatCard({ title, to, color, children }) {
  return (
    <Link to={to} className={`block rounded-2xl p-4 ${color} hover:opacity-90 transition-opacity`}>
      <p className="text-xs font-medium text-white/80 mb-1">{title}</p>
      {children}
    </Link>
  )
}

function InsightCard({ insight }) {
  const domains = insight.domains ?? []
  const isEmpty = insight.type === 'empty'

  return (
    <div className={`flex gap-3 items-start ${isEmpty ? 'opacity-60' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        {isEmpty ? (
          <span className="text-lg">💡</span>
        ) : domains.length >= 2 ? (
          <span className="text-lg">✨</span>
        ) : (
          <span className="text-lg">📊</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{insight.text}</p>
        {domains.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {domains.map(d => (
              <span
                key={d}
                className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${DOMAIN_STYLES[d] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {DOMAIN_LABELS[d]} {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const BURNOUT_COLORS = {
  low:    'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high:   'text-rose-600 dark:text-rose-400',
}

const BURNOUT_BG = {
  low:    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  high:   'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
}

export default function Dashboard() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)
  const [learning, setLearning] = useState(null)
  const [finance, setFinance] = useState(null)
  const [health, setHealth] = useState(null)
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [burnout, setBurnout] = useState(null)
  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/learning/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setLearning).catch(() => {})
    fetch(`${API}/finance/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setFinance).catch(() => {})
    fetch(`${API}/health-domain/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setHealth).catch(() => {})
    fetch(`${API}/ml/burnout/${userId}`).then(r => r.ok ? r.json() : null).then(setBurnout).catch(() => {})
    fetch(`${API}/ml/forecast/${userId}`).then(r => r.ok ? r.json() : null).then(setForecast).catch(() => {})

    setInsightsLoading(true)
    fetch(`${API}/insights/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setInsights(data?.insights ?? []); setInsightsLoading(false) })
      .catch(() => { setInsights([]); setInsightsLoading(false) })
  }, [userId])

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">{t('dashboard.title')}</h1>
        <span className="text-2xl">👋</span>
      </header>

      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {/* Stat cards */}
        <StatCard title={t('dashboard.learning')} to="/learning" color="bg-indigo-500">
          {learning ? (
            <div className="text-white">
              <p className="text-2xl font-bold">{learning.sessions_this_week} <span className="text-sm font-normal">{t('dashboard.sessions')}</span></p>
              <p className="text-sm mt-0.5">{learning.total_minutes} {t('dashboard.minutes')} · {learning.goals?.length ?? 0} {t('dashboard.goals')}</p>
            </div>
          ) : (
            <p className="text-white/70 text-sm">{t('dashboard.no_data')}</p>
          )}
        </StatCard>

        <StatCard title={t('dashboard.finance')} to="/finance" color="bg-emerald-500">
          {finance ? (
            <div className="text-white">
              <p className="text-2xl font-bold">{finance.total_spent?.toFixed(0)} <span className="text-sm font-normal">{finance.currency}</span></p>
              <p className="text-sm mt-0.5">{finance.recent_transactions?.length ?? 0} {t('dashboard.transactions')}</p>
            </div>
          ) : (
            <p className="text-white/70 text-sm">{t('dashboard.no_data')}</p>
          )}
        </StatCard>

        <StatCard title={t('dashboard.health')} to="/health" color="bg-rose-500">
          {health ? (
            <div className="text-white">
              <p className="text-2xl font-bold">
                {health.avg_mood_7d ?? '—'}<span className="text-sm font-normal">/10</span>
                <span className="ml-3 text-lg">{health.avg_sleep_7d ?? '—'}г</span>
              </p>
              <p className="text-sm mt-0.5">{t('dashboard.mood')} · {t('dashboard.sleep')} · {health.checkin_count ?? 0} {t('dashboard.checkins')}</p>
            </div>
          ) : (
            <p className="text-white/70 text-sm">{t('dashboard.no_data')}</p>
          )}
        </StatCard>

        {/* Burnout Risk */}
        <div className={`rounded-2xl p-4 border ${burnout ? BURNOUT_BG[burnout.level] : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🔋</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.burnout_title')}</p>
            </div>
            {burnout && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BURNOUT_COLORS[burnout.level]}`}>
                {t(`dashboard.burnout_${burnout.level}`)} · {burnout.score}/100
              </span>
            )}
          </div>
          {!burnout ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('dashboard.burnout_no_data')}</p>
          ) : (
            <>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                <div
                  className={`h-1.5 rounded-full transition-all ${burnout.level === 'high' ? 'bg-rose-500' : burnout.level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${burnout.score}%` }}
                />
              </div>
              {burnout.recommendations?.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                  {burnout.recommendations[0]}
                </p>
              )}
            </>
          )}
        </div>

        {/* Spending Forecast */}
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📈</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.forecast_title')}</p>
          </div>
          {!forecast || forecast.model === 'insufficient_data' ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {forecast?.warning || t('dashboard.forecast_no_data')}
            </p>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {forecast.total_projected_30d?.toFixed(0)}
                <span className="text-sm font-normal text-gray-500 ml-1">{forecast.currency}</span>
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {(forecast.categories ?? []).slice(0, 3).map(c => (
                  <div key={c.category} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{c.category}</span>
                    <span>{c.projected_30d?.toFixed(0)} {c.currency}</span>
                  </div>
                ))}
              </div>
              {forecast.warning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{forecast.warning}</p>
              )}
            </>
          )}
        </div>

        {/* Cross-domain insights */}
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🧠</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.insights_title')}</p>
          </div>

          {insightsLoading ? (
            <div className="flex gap-2 items-center text-gray-400 dark:text-gray-500 text-sm">
              <span className="animate-spin">⟳</span>
              {t('dashboard.insights_loading')}
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="flex flex-col gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('dashboard.insights_empty')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
