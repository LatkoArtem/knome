import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

function StatCard({ title, to, color, children }) {
  return (
    <Link to={to} className={`block rounded-2xl p-4 ${color} hover:opacity-90 transition-opacity`}>
      <p className="text-xs font-medium text-white/80 mb-1">{title}</p>
      {children}
    </Link>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)
  const [learning, setLearning] = useState(null)
  const [finance, setFinance] = useState(null)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/learning/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setLearning).catch(() => {})
    fetch(`${API}/finance/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setFinance).catch(() => {})
    fetch(`${API}/health-domain/summary/${userId}`).then(r => r.ok ? r.json() : null).then(setHealth).catch(() => {})
  }, [userId])

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">{t('dashboard.title')}</h1>
        <span className="text-2xl">👋</span>
      </header>

      <div className="flex-1 px-4 py-4 grid grid-cols-1 gap-3">
        {/* Learning */}
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

        {/* Finance */}
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

        {/* Health */}
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
      </div>
    </div>
  )
}
