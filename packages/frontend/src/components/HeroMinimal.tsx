import { ArrowRight, Activity, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useIdolToken } from '../hooks/useIdolToken'
import { useT } from '../i18n'

const HeroMinimal = () => {
  const { totalSupply, holderCount, treasuryValue, currentPrice } = useIdolToken()
  const t = useT()

  return (
    <section className="pt-32 pb-24 relative overflow-hidden">
      <div className="container">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-px bg-white/20" />
            <span className="text-sm text-white/40 uppercase tracking-[0.2em]">
              NovaIdol Protocol
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-semibold text-white leading-[0.95] tracking-tight mb-8">
            {t('hero.title.line1')}
            <br />
            <span className="text-white/40">{t('hero.title.line2')}</span>
          </h1>

          {/* Subhead */}
          <p className="text-xl text-white/50 max-w-xl mb-12 leading-relaxed">
            {t('hero.subtitle')}
          </p>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-4 mb-16">
            <Link to="/create" className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-white/90 transition-all">
              {t('hero.cta.create')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/explore" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors px-4">
              {t('hero.cta.explore')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-white/20" />
                <span className="text-xs text-white/30 uppercase tracking-wider">{t('hero.stat.treasury')}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-white tabular-nums">
                  {treasuryValue.toFixed(2)}
                </span>
                <span className="text-sm text-white/40">INJ</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-white/20" />
                <span className="text-xs text-white/30 uppercase tracking-wider">{t('hero.stat.fans')}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-white tabular-nums">
                  {holderCount}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-white/20" />
                <span className="text-xs text-white/30 uppercase tracking-wider">{t('hero.stat.threshold')}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-white tabular-nums">
                  10%
                </span>
                <span className="text-sm text-white/40">{t('hero.stat.threshold.value')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  )
}

export default HeroMinimal
