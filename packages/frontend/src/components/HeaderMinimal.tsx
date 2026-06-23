import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ArrowUpRight } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Overview' },
  { path: '/explore', label: 'Agents' },
  { path: '/create', label: 'Create' },
  { path: '/docs', label: 'Docs' },
]

const HeaderMinimal = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo - minimal wordmark */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">N</span>
            </div>
            <span className="font-medium text-white tracking-tight">NovaIdol</span>
          </Link>

          {/* Navigation - desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'text-white bg-white/5'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Menu */}
          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors">
              Launch App
              <ArrowUpRight className="w-4 h-4" />
            </button>

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 text-white/40 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-white/5">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 text-sm rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'text-white bg-white/5'
                    : 'text-white/40'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button className="w-full mt-4 px-4 py-3 bg-white text-black text-sm font-medium rounded-lg flex items-center justify-center gap-2">
              Launch App
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}

export default HeaderMinimal
