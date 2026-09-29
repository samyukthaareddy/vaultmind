import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle size={14} className="text-emerald-400 shrink-0" />,
  error:   <AlertCircle size={14} className="text-rose-400 shrink-0" />,
  info:    <Info size={14} className="text-blue-400 shrink-0" />,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id))

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 shadow-xl text-sm text-slate-200 min-w-56 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {ICONS[t.type]}
            <span className="flex-1 text-xs">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
