import { useEffect, useState } from 'react'
import { adminApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Settings, Check, X } from 'lucide-react'

const ROLES = ['ADMIN', 'ENGINEER', 'MANAGER', 'SALES', 'HR']
const ACCESS_LEVELS = ['PUBLIC', 'INTERNAL', 'TEAM_ONLY', 'CONFIDENTIAL', 'RESTRICTED']

const ACCESS_MATRIX = [
  { role: 'ADMIN',    access: [true,  true,  true,  true,  true]  },
  { role: 'MANAGER',  access: [true,  true,  true,  true,  false] },
  { role: 'ENGINEER', access: [true,  true,  true,  false, false] },
  { role: 'HR',       access: [true,  true,  false, true,  false] },
  { role: 'SALES',    access: [true,  true,  false, false, false] },
]

function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i}>
      <td className="px-4 py-3"><div className="skeleton h-3.5 w-28 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-40 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-24 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-6 w-24 rounded" /></td>
    </tr>
  ))
}

export default function Admin() {
  const { user }              = useAuth()
  const [users, setUsers]     = useState([])
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)

  useEffect(() => {
    if (user?.role !== 'ADMIN') { setError('Admin access required'); setLoading(false); return }
    adminApi.users().then(r => setUsers(r.data)).catch(() => setError('Failed to load users')).finally(() => setLoading(false))
  }, [user])

  const changeRole = async (userId, role) => {
    setSaving(userId)
    try {
      const r = await adminApi.setRole(userId, role)
      setUsers(u => u.map(x => x.user_id === userId ? r.data : x))
    } catch {
      alert('Failed to update role')
    } finally {
      setSaving(null)
    }
  }

  if (error) return <div className="p-6"><p className="text-rose-400 text-sm">{error}</p></div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Settings size={14} className="text-slate-500" />
        <div>
          <h1 className="text-base font-semibold text-slate-100">Admin Panel</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage users, roles, and permissions.</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows /> : users.map(u => (
              <tr key={u.user_id}>
                <td className="px-4 py-3 font-medium text-slate-200">{u.name}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{u.department || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => changeRole(u.user_id, e.target.value)}
                    disabled={saving === u.user_id}
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-vault-500 disabled:opacity-50"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card space-y-3">
        <p className="section-label">Access Level Matrix</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-slate-500 font-semibold w-24">Role</th>
                {ACCESS_LEVELS.map(l => (
                  <th key={l} className="text-center py-2 px-3 text-slate-500 font-semibold whitespace-nowrap">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACCESS_MATRIX.map(({ role, access }) => (
                <tr key={role} className="border-t border-slate-800">
                  <td className="py-2.5 pr-4 font-medium text-slate-300">{role}</td>
                  {access.map((allowed, i) => (
                    <td key={i} className="py-2.5 px-3 text-center">
                      {allowed
                        ? <Check size={13} className="text-emerald-500 mx-auto" />
                        : <X size={13} className="text-slate-700 mx-auto" />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
