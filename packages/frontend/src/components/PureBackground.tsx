const PureBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#0a0a0a]">
      {/* Subtle grid - very faint */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />
    </div>
  )
}

export default PureBackground
