import { useState, useEffect } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  delay?: number
  className?: string
  onComplete?: () => void
}

const TypewriterText = ({ 
  text, 
  speed = 50, 
  delay = 0, 
  className = '',
  onComplete 
}: TypewriterTextProps) => {
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    const startTyping = () => {
      setIsTyping(true)
      let currentIndex = 0
      
      const typeChar = () => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1))
          currentIndex++
          timeout = setTimeout(typeChar, speed + Math.random() * 30) // Randomize for natural feel
        } else {
          setIsTyping(false)
          onComplete?.()
        }
      }
      
      typeChar()
    }
    
    const delayTimeout = setTimeout(startTyping, delay)
    
    return () => {
      clearTimeout(delayTimeout)
      clearTimeout(timeout)
    }
  }, [text, speed, delay, onComplete])

  // Blink cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className={`${className} ${isTyping ? 'typing' : ''}`}>
      {displayText}
      <span 
        className={`inline-block w-0.5 h-[1em] bg-[var(--primary-400)] ml-0.5 align-middle transition-opacity ${showCursor ? 'opacity-100' : 'opacity-0'}`}
      />
    </span>
  )
}

// Multi-text cycling typewriter
interface CyclingTypewriterProps {
  texts: string[]
  className?: string
  speed?: number
  pauseDuration?: number
}

export const CyclingTypewriter = ({ 
  texts, 
  className = '',
  speed = 50,
  pauseDuration = 2000
}: CyclingTypewriterProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [key, setKey] = useState(0)

  const handleComplete = () => {
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length)
      setKey(prev => prev + 1)
    }, pauseDuration)
  }

  return (
    <span key={key} className={className}>
      <TypewriterText 
        text={texts[currentIndex]} 
        speed={speed}
        onComplete={handleComplete}
      />
    </span>
  )
}

export default TypewriterText
