import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Brain, AlertCircle } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { label: 'Admin',    email: 'admin@novapay.com',         password: 'admin123'  },
  { label: 'Engineer', email: 'new.engineer@novapay.com',  password: 'new123'    },
  { label: 'Sales',    email: 'sales.rep@novapay.com',     password: 'sales123'  },
  { label: 'Manager',  email: 'rachel.kim@novapay.com',    password: 'rachel123' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('admin@novapay.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-vault-600 rounded-xl mb-4">
            <Brain size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">VaultMind</h1>
          <p className="text-slate-500 text-sm mt-1">When people leave, their knowledge shouldn't.</p>
        </div>

        {/* Form */}
        <div className="card space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-md px-3 py-2">
                <AlertCircle size={13} className="shrink-0" />
                {error}
              </div>
            )}

            <button className="btn-primary w-full justify-center mt-1" disabled={loading}>
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                : 'Sign In'
              }
            </button>
          </form>

          {/* Demo accounts */}
          <div className="pt-3 border-t border-slate-800">
            <p className="section-label mb-2">Demo accounts — NovaPay</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map(a => (
                <button
                  key={a.email}
                  onClick={() => { setEmail(a.email); setPassword(a.password) }}
                  className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-md px-2.5 py-2 transition-colors duration-150"
                >
                  <span className="font-medium text-slate-300">{a.label}</span>
                  <br />
                  <span className="text-slate-500 text-2xs">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">NovaPay · Internal Platform</p>
      </div>
    </div>
  )
}
