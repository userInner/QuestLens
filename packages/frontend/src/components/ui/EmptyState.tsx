import { ReactNode } from 'react'
import { Inbox, Search, FileX, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'file' | 'error' | ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

const iconComponents: Record<string, ReactNode> = {
  inbox: <Inbox className="w-12 h-12 text-[var(--text-faint)]" />,
  search: <Search className="w-12 h-12 text-[var(--text-faint)]" />,
  file: <FileX className="w-12 h-12 text-[var(--text-faint)]" />,
  error: <AlertCircle className="w-12 h-12 text-[var(--error)]" />,
}

export const EmptyState = ({
  icon = 'inbox',
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) => {
  const IconComponent = typeof icon === 'string' ? iconComponents[icon] : icon

  return (
    <div className="card text-center py-12">
      <div className="flex justify-center mb-4">{IconComponent}</div>
      <h3 className="text-lg font-semibold text-[var(--text-default)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            <button onClick={action.onClick} className="btn-primary">
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn-secondary">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
