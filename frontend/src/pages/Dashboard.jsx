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

export default function Dashboard() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)
  const [learning, setLearning] = useState(null)
  const [finance, setFinance] = useState(null)
  const [health, setHealth] = useState(null)
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/learning/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setLearning).catch(() => {})
    fetch(`${API}/finance/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setFinance).catch(() => {})
    fetch(`${API}/health-domain/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setHealth).catch(() => {})

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
