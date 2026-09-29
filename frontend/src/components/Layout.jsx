import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Brain, LayoutDashboard, MessageSquare, Clock, Database,
  Shield, Settings, Upload, LogOut, Activity, ChevronRight,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/',           icon: LayoutDashboard, label: 'Dashboard',       end: true },
      { to: '/ask',        icon: MessageSquare,   label: 'Ask Memory' },
      { to: '/memories',   icon: Database,        label: 'Memory Explorer' },
      { to: '/timeline',   icon: Clock,           label: 'Timeline' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/intelligence', icon: Activity, label: 'Health & Insights', badge: 'NEW' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/ingest', icon: Upload,  label: 'Ingest' },
      { to: '/audit',  icon: Shield,  label: 'Audit Log' },
      { to: '/admin',  icon: Settings, label: 'Admin' },
    ],
  },
]

function NavItem({ to, icon: Icon, label, end, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-150 relative ${
          isActive
            ? 'bg-slate-800 text-slate-100 font-medium'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-vault-500 rounded-r-full" />
          )}
          <Icon size={14} className="shrink-0" />
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="text-2xs font-semibold bg-vault-600/30 text-vault-400 border border-vault-700/40 px-1.5 py-0.5 rounded tracking-wide uppercase">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  const roleColor = {
    ADMIN: 'bg-violet-950/60 text-violet-400 border border-violet-800/40',
    MANAGER: 'bg-blue-950/60 text-blue-400 border border-blue-800/40',
    ENGINEER: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40',
    SALES: 'bg-amber-950/60 text-amber-400 border border-amber-800/40',
    HR: 'bg-orange-950/60 text-orange-400 border border-orange-800/40',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-52 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-12 px-4 flex items-center gap-2.5 border-b border-slate-800">
          <div className="w-6 h-6 bg-vault-600 rounded-md flex items-center justify-center shrink-0">
            <Brain size={13} className="text-white" />
          </div>
          <span className="font-semibold text-slate-100 text-sm tracking-tight">VaultMind</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="section-label px-3 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-2xs font-semibold text-slate-300">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.name}</p>
              <span className={`badge-sm mt-0.5 ${roleColor[user?.role] || 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-slate-600 hover:text-rose-400 transition-colors duration-150 shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  )
}
