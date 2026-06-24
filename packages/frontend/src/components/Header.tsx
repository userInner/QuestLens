import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Wallet as WalletIcon, Menu, X, ChevronDown, LogOut, Copy, Check, Loader2 } from 'lucide-react'
import { useWallet, WALLET_OPTIONS } from '../hooks/useWallet'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const {
    isConnected,
    isConnecting,
    injectiveAddress,
    balance,
    error,
    connect,
    disconnect,
  } = useWallet()

  const isActive = (path: string) => location.pathname === path

  // Truncate address for display
  const truncateAddress = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : ''

  // Copy address to clipboard
  const copyAddress = async () => {
    if (injectiveAddress) {
      await navigator.clipboard.writeText(injectiveAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle wallet selection
  const handleWalletSelect = async (walletType: (typeof WALLET_OPTIONS)[number]['id']) => {
    setShowWalletModal(false)
    await connect(walletType)
  }

  // Handle disconnect
  const handleDisconnect = () => {
    setShowAccountMenu(false)
    disconnect()
  }

  // Close account menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Listen for open-wallet-modal events from other components
  useEffect(() => {
    const handleOpenModal = () => setShowWalletModal(true)
    window.addEventListener('open-wallet-modal', handleOpenModal)
    return () => window.removeEventListener('open-wallet-modal', handleOpenModal)
  }, [])

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="logo flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span>Nova<span className="logo-accent">Idol</span></span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { path: '/explore', label: 'Explore' },
                { path: '/create', label: 'Create' },
                { path: '/agent', label: 'Agent' },
                { path: '/portfolio', label: 'Portfolio' },
                { path: '/docs', label: 'Docs' },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'bg-[var(--surface-hover)] text-[var(--text-default)]' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Wallet - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {isConnected ? (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="btn-secondary"
                  >
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="font-mono text-sm">{truncateAddress(injectiveAddress)}</span>
                    <ChevronDown className="w-4 h-4 text-[var(--text-faint)]" />
                  </button>

                  {/* Account Dropdown */}
                  {showAccountMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-xl z-50 overflow-hidden animate-fade-in">
                      <div className="p-4 border-b border-[var(--border-subtle)]">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Balance</p>
                        <p className="text-lg font-semibold text-[var(--text-default)]">
                          {balance} INJ
                        </p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={copyAddress}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-default)] transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Address'}
                        </button>
                        <button
                          onClick={handleDisconnect}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowWalletModal(true)}
                  disabled={isConnecting}
                  className="btn-primary text-sm"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <WalletIcon className="w-4 h-4" />
                  )}
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden btn-ghost"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-[var(--border-subtle)] animate-fade-in">
              <nav className="flex flex-col gap-1">
                {[
                  { path: '/', label: 'Home' },
                  { path: '/explore', label: 'Explore' },
                  { path: '/create', label: 'Create' },
                  { path: '/docs', label: 'Docs' },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link ${isActive(item.path) ? 'bg-[var(--surface-hover)] text-[var(--text-default)]' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                {isConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-hover)]">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Connected</p>
                        <p className="font-mono text-sm text-[var(--text-default)]">{truncateAddress(injectiveAddress)}</p>
                      </div>
                      <p className="text-sm font-medium text-[var(--text-default)]">{balance} INJ</p>
                    </div>
                    <button onClick={handleDisconnect} className="btn-secondary w-full text-red-400">
                      <LogOut className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsMenuOpen(false); setShowWalletModal(true) }}
                    disabled={isConnecting}
                    className="btn-primary w-full"
                  >
                    <WalletIcon className="w-4 h-4" />
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowWalletModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
              <h2 className="text-lg font-semibold text-[var(--text-default)]">Connect Wallet</h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-default)] hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wallet Options */}
            <div className="p-4 space-y-2">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet.id)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary-500)] hover:bg-[var(--surface-hover)] transition-all group"
                >
                  <img
                    src={wallet.icon}
                    alt={wallet.name}
                    className="w-10 h-10 rounded-xl"
                  />
                  <div className="text-left">
                    <p className="font-medium text-[var(--text-default)] group-hover:text-[var(--primary-400)]">
                      {wallet.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{wallet.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-4 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 pb-5">
              <p className="text-xs text-center text-[var(--text-faint)]">
                By connecting, you agree to the Terms of Service
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
