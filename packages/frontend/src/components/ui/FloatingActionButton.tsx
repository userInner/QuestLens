import { useState, useEffect } from 'react'
import { Plus, MessageSquare, ArrowUp, Share2 } from 'lucide-react'

interface FloatingActionButtonProps {
  actions?: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    color?: string
  }>
}

export const FloatingActionButton = ({ actions }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const defaultActions: FloatingActionButtonProps['actions'] = actions || [
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Chat', onClick: () => {}, color: 'var(--primary-600)' },
    { icon: <Share2 className="w-5 h-5" />, label: 'Share', onClick: () => {}, color: 'var(--primary-600)' },
  ]

  return (
    <>
      {/* Main FAB */}
      <div className="fixed bottom-6 right-6 z-[var(--z-popover)] flex flex-col items-end gap-3">
        {/* Expanded actions */}
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-300 ${
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {defaultActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick()
                setIsOpen(false)
              }}
              className="flex items-center gap-3 group"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <span className="text-sm font-medium text-[var(--text-default)] bg-[var(--bg-elevated)] px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--border-subtle)]">
                {action.label}
              </span>
              <div
                className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: action.color || 'var(--primary-600)',
                }}
              >
                {action.icon}
              </div>
            </button>
          ))}
        </div>

        {/* Main button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full bg-[var(--primary-600)] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 left-6 z-[var(--z-popover)] w-12 h-12 rounded-full bg-[var(--bg-elevated)] text-[var(--text-default)] shadow-lg border border-[var(--border-default)] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  )
}

export default FloatingActionButton
