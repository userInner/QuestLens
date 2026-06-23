import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

const toastIcons = {
  success: <CheckCircle className="w-5 h-5 text-[var(--success)]" />,
  error: <AlertCircle className="w-5 h-5 text-[var(--error)]" />,
  info: <Info className="w-5 h-5 text-[var(--primary-400)]" />,
  warning: <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />,
}

const toastStyles = {
  success: 'border-l-[var(--success)]',
  error: 'border-l-[var(--error)]',
  info: 'border-l-[var(--primary-400)]',
  warning: 'border-l-[var(--warning)]',
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  return (
    <div className="fixed top-20 right-4 z-[var(--z-popover)] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  const [progress, setProgress] = useState(100)
  const duration = toast.duration || 5000

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          onRemove(toast.id)
          return 0
        }
        return prev - (100 / (duration / 100))
      })
    }, 100)

    return () => clearInterval(timer)
  }, [toast.id, duration, onRemove])

  return (
    <div
      className={`card p-4 border-l-4 ${toastStyles[toast.type]} animate-slide-in shadow-lg`}
      style={{ background: 'var(--bg-elevated)' }}
    >
      <div className="flex items-start gap-3">
        {toastIcons[toast.type]}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-default)] text-sm">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="btn-ghost p-1 -mr-2 -mt-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-0.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor:
              toast.type === 'success'
                ? 'var(--success)'
                : toast.type === 'error'
                ? 'var(--error)'
                : toast.type === 'warning'
                ? 'var(--warning)'
                : 'var(--primary-400)',
          }}
        />
      </div>
    </div>
  )
}

// Hook for using toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, removeToast }
}

export default ToastContainer
