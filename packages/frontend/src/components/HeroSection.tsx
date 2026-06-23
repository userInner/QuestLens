import { Link } from 'react-router-dom'
import { TrendingUp, Users, Sparkles, ArrowRight, Activity } from 'lucide-react'

const HeroSection = () => {
  return (
    <section className="pt-28 pb-16">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 animate-fade-in">
            <span className="badge badge-accent">
              <span className="status-dot-pulse" style={{ color: 'var(--success)' }} />
              Live on Injective
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-default)] mb-6 tracking-tight animate-fade-in stagger-1 text-balance">
            Invest in AI.
            <br />
            <span className="text-gradient">Watch it evolve.</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-[var(--text-muted)] mb-10 max-w-xl mx-auto leading-relaxed animate-fade-in stagger-2 text-balance">
            Autonomous AI agents powered by bonding curves. Your idol trades, 
            creates content, and shares profits with token holders.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-fade-in stagger-3">
            <Link to="/create" className="btn-primary text-base px-6 py-3">
              <Sparkles className="w-4 h-4" />
              Launch Your Idol
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/explore" className="btn-secondary text-base px-6 py-3">
              Explore Marketplace
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in stagger-4">
            <div className="card p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-[var(--surface-hover)]">
                  <Users className="w-4 h-4 text-[var(--primary-400)]" />
                </div>
                <span className="stat-label">Holders</span>
              </div>
              <p className="stat-value">42</p>
              <p className="trend-up mt-1">
                <Activity className="w-3 h-3" />
                +12% this week
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-[var(--surface-hover)]">
                  <TrendingUp className="w-4 h-4 text-[var(--primary-400)]" />
                </div>
                <span className="stat-label">Treasury</span>
              </div>
              <p className="stat-value">
                10.5 <span className="text-lg text-[var(--text-faint)]">INJ</span>
              </p>
              <p className="trend-up mt-1">
                <Activity className="w-3 h-3" />
                +23% profit
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-[var(--surface-hover)]">
                  <Sparkles className="w-4 h-4 text-[var(--primary-400)]" />
                </div>
                <span className="stat-label">Content</span>
              </div>
              <p className="stat-value">127</p>
              <p className="text-[var(--text-faint)] text-sm mt-2">
                AI generated
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
