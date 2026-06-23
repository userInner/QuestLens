import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize particles
    const colors = ['#6366f1', '#818cf8', '#4f46e5', '#10b981', '#f59e0b']
    const particleCount = 25
    
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    let frameCount = 0
    const animate = () => {
      frameCount++
      // Render every 2nd frame for performance (30fps)
      if (frameCount % 2 !== 0) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle, i) => {
        // Mouse interaction (only for every 5th particle for performance)
        if (i % 5 === 0) {
          const dx = mouseRef.current.x - particle.x
          const dy = mouseRef.current.y - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const force = (150 - dist) / 150
            particle.vx -= (dx / dist) * force * 0.02
            particle.vy -= (dy / dist) * force * 0.02
          }
        }

        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Boundary check
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        // Damping
        particle.vx *= 0.99
        particle.vy *= 0.99

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.opacity
        ctx.fill()
        ctx.globalAlpha = 1

        // Draw connections (limited for performance)
        if (i % 3 === 0) {
          particlesRef.current.slice(i + 1).forEach((other, j) => {
            if (j % 2 !== 0) return
            const dx = particle.x - other.x
            const dy = particle.y - other.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < 100) {
              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(other.x, other.y)
              ctx.strokeStyle = particle.color
              ctx.globalAlpha = (1 - dist / 100) * 0.2
              ctx.stroke()
              ctx.globalAlpha = 1
            }
          })
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  )
}

export default ParticleBackground
