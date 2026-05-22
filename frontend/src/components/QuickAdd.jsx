import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, X, Wallet, Heart, BookOpen } from 'lucide-react'
import { useStore } from '../store'

const API = 'http://localhost:8000/api'

const ACTIONS = [
  {
    label: 'Витрата',
    Icon: Wallet,
    color: 'bg-emerald-600 hover:bg-emerald-500',
    ring: 'ring-emerald-500/30',
    action: 'finance',
  },
  {
    label: 'Check-in',
    Icon: Heart,
    color: 'bg-rose-600 hover:bg-rose-500',
    ring: 'ring-rose-500/30',
    action: 'health',
  },
  {
    label: 'Сесія',
    Icon: BookOpen,
    color: 'bg-indigo-600 hover:bg-indigo-500',
    ring: 'ring-indigo-500/30',
    action: 'learning',
  },
]

export default function QuickAdd() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Hide on pages that already have dedicated add forms
  const hidden = ['/login', '/onboarding'].includes(location.pathname)
  if (hidden) return null

  const handleAction = (action) => {
    setOpen(false)
    navigate(`/${action}`)
  }

  return (
    <div className="lg:hidden fixed bottom-16 right-4 z-40 flex flex-col items-end gap-2">
      {/* Action buttons */}
      {open && (
        <div className="flex flex-col items-end gap-2 animate-fade-in">
          {ACTIONS.map(({ label, Icon, color, ring, action }) => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-white text-sm font-medium shadow-lg ring-2 ${ring} ${color} transition-all duration-150`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl ring-2 transition-all duration-200 ${
          open
            ? 'bg-zinc-700 ring-zinc-600/40 rotate-45'
            : 'bg-blue-600 ring-blue-500/30 hover:bg-blue-500'
        }`}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
      </button>
    </div>
  )
}
