import { ArrowRight, Activity, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useIdolToken } from '../hooks/useIdolToken'

const HeroMinimal = () => {
  const { totalSupply, holderCount, treasuryValue, currentPrice } = useIdolToken()

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
            Your Face,
            <br />
            <span className="text-white/40">Your Asset.</span>
          </h1>

          {/* Subhead */}
          <p className="text-xl text-white/50 max-w-xl mb-12 leading-relaxed">
            上传形象，铸造链上身份，发行专属代币。粉丝买入即投资，持币即获得 AI 短剧使用权。每次出演，所有持币者共享收益。
          </p>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-4 mb-16">
            <Link to="/create" className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-white/90 transition-all">
              铸造你的 AI 偶像
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/explore" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors px-4">
              浏览已有偶像
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats - real chain data */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-white/20" />
                <span className="text-xs text-white/30 uppercase tracking-wider">Treasury 总额</span>
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
                <span className="text-xs text-white/30 uppercase tracking-wider">粉丝 (持币者)</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-white tabular-nums">
                  {holderCount}
                </span>
                <span className="text-sm text-white/40">人</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-white/20" />
                <span className="text-xs text-white/30 uppercase tracking-wider">使用权门槛</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-white tabular-nums">
                  10%
                </span>
                <span className="text-sm text-white/40">持仓起</span>
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
