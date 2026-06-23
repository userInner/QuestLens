const AuroraBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
      
      {/* Aurora wave 1 - Purple */}
      <div 
        className="absolute -top-1/2 left-0 w-[200%] h-[200%] animate-aurora-1 opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.4) 0%, transparent 50%)',
          transform: 'translateX(-25%)',
        }}
      />
      
      {/* Aurora wave 2 - Cyan */}
      <div 
        className="absolute -top-1/2 left-0 w-[200%] h-[200%] animate-aurora-2 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 70% 30%, rgba(16, 185, 129, 0.4) 0%, transparent 50%)',
          transform: 'translateX(25%)',
        }}
      />
      
      {/* Aurora wave 3 - Pink/Orange */}
      <div 
        className="absolute -top-1/2 left-0 w-[200%] h-[200%] animate-aurora-3 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, rgba(236, 72, 153, 0.3) 0%, rgba(245, 158, 11, 0.3) 30%, transparent 60%)',
        }}
      />

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

export default AuroraBackground
