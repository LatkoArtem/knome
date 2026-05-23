import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageCircle, LayoutDashboard, BookOpen, Wallet, Heart,
  Dumbbell, CheckSquare, NotebookPen, Users, Briefcase,
  Settings, LogOut, Zap
} from 'lucide-react'
import { useStore } from '../store'

export default function Sidebar() {
  const { t } = useTranslation()
  const userName  = useStore((s) => s.userName)
  const userEmail = useStore((s) => s.userEmail)
  const logout    = useStore((s) => s.logout)
  const navigate  = useNavigate()

  const NAV = [
    { to: '/chat',         label: t('nav.chat'),         Icon: MessageCircle   },
    { to: '/dashboard',    label: t('nav.dashboard'),    Icon: LayoutDashboard },
    { to: '/learning',     label: t('nav.learning'),     Icon: BookOpen        },
    { to: '/finance',      label: t('nav.finance'),      Icon: Wallet          },
    { to: '/health',       label: t('nav.health'),       Icon: Heart           },
    { to: '/workout',       label: t('nav.workout'),       Icon: Dumbbell    },
    { to: '/productivity',  label: t('nav.productivity'),  Icon: CheckSquare },
    { to: '/reflection',    label: t('nav.reflection'),    Icon: NotebookPen },
    { to: '/relationships', label: t('nav.relationships'), Icon: Users       },
    { to: '/career',        label: t('nav.career'),        Icon: Briefcase   },
  ]

  const initials    = (userName || userEmail || 'U')[0].toUpperCase()
  const displayName = userName || userEmail?.split('@')[0] || 'User'

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-[220px] bg-zinc-950 border-r border-white/[0.06] z-30">
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/[0.06] shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Zap className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="font-semibold text-sm text-zinc-100 tracking-tight">Knome</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon className="w-4 h-4 shrink-0 opacity-75" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 space-y-0.5 border-t border-white/[0.06] pt-3">
          <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Settings className="w-4 h-4 shrink-0 opacity-75" />
            {t('nav.settings')}
          </NavLink>

          <button onClick={() => { logout(); navigate('/login') }} className="nav-item w-full mt-1" title={t('sidebar.logout_hint')}>
            <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-semibold shrink-0">
              {initials}
            </div>
            <span className="truncate text-zinc-300 text-xs">{displayName}</span>
            <LogOut className="w-3.5 h-3.5 ml-auto opacity-40 hover:opacity-70" />
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur border-t border-white/[0.06]">
        <div className="flex justify-around items-center h-14 px-1 max-w-lg mx-auto">
          {[...NAV, { to: '/settings', label: t('nav.settings'), Icon: Settings }].map(({ to, label, Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors duration-150 min-w-0 ${
                  isActive ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
