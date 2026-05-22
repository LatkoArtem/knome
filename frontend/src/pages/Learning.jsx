import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

export default function Learning() {
  const { t } = useTranslation()
  const userId = useStore((s) => s.userId)
  const [data, setData] = useState(null)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [sessionDuration, setSessionDuration] = useState('')
  const [sessionTopic, setSessionTopic] = useState('')
  const [goalDesc, setGoalDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!userId) return
    fetch(`${API}/learning/summary/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
  }

  useEffect(() => { load() }, [userId])

  const saveSession = async () => {
    if (!sessionDuration || saving) return
    setSaving(true)
    await fetch(`${API}/learning/session/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_min: parseInt(sessionDuration), topic: sessionTopic }),
    })
    setSaving(false)
    setShowSessionForm(false)
    setSessionDuration('')
    setSessionTopic('')
    load()
  }

  const saveGoal = async () => {
    if (!goalDesc || saving) return
    setSaving(true)
    await fetch(`${API}/learning/goal/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: goalDesc }),
    })
    setSaving(false)
    setShowGoalForm(false)
    setGoalDesc('')
    load()
  }

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <span className="text-xl">📚</span>
        <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">{t('learning.title')}</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setShowGoalForm(true); setShowSessionForm(false) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
            + {t('learning.add_goal')}
          </button>
          <button onClick={() => { setShowSessionForm(true); setShowGoalForm(false) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white">
            + {t('learning.add_session')}
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Session form */}
        {showSessionForm && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3">
            <input type="number" min="1" placeholder={t('learning.duration_label')} value={sessionDuration}
              onChange={e => setSessionDuration(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm" />
            <input type="text" placeholder={t('learning.topic_label')} value={sessionTopic}
              onChange={e => setSessionTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm" />
            <div className="flex gap-2">
              <button onClick={saveSession} disabled={saving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {t('learning.save')}
              </button>
              <button onClick={() => setShowSessionForm(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm">
                {t('learning.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Goal form */}
        {showGoalForm && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3">
            <input type="text" placeholder={t('learning.goal_label')} value={goalDesc}
              onChange={e => setGoalDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm" />
            <div className="flex gap-2">
              <button onClick={saveGoal} disabled={saving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {t('learning.save')}
              </button>
              <button onClick={() => setShowGoalForm(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm">
                {t('learning.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Goals */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t('learning.goals_title')}
          </h2>
          {data?.goals?.length ? (
            <ul className="space-y-2">
              {data.goals.map((g, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="flex-1">{g.description}</span>
                  <span className="text-xs text-gray-400">{g.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">{t('learning.no_goals')}</p>
          )}
        </section>

        {/* Sessions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t('learning.sessions_title')}
          </h2>
          {data?.recent_sessions?.length ? (
            <ul className="space-y-2">
              {data.recent_sessions.map((s, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <span className="text-indigo-500 font-semibold w-12 shrink-0">{s.duration}хв</span>
                  <span className="text-gray-500 text-xs">{s.date?.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">{t('learning.no_sessions')}</p>
          )}
          {data && (
            <p className="text-xs text-gray-400 mt-2">
              Всього за тиждень: {data.total_minutes} хв ({data.sessions_this_week} сесій)
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
