import { useState, useEffect } from 'react'

interface SplitTextProps {
  text: string
  isAnimating: boolean
  delay?: number
  staggerDelay?: number
  className?: string
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  isAnimating,
  delay = 0,
  staggerDelay = 50,
  className = ''
}) => {
  const [animatedChars, setAnimatedChars] = useState<boolean[]>([])

  useEffect(() => {
    if (!isAnimating) {
      setAnimatedChars(new Array(text.length).fill(true))
      return
    }

    // Reset all characters to invisible
    setAnimatedChars(new Array(text.length).fill(false))

    // Animate each character with staggered delay
    text.split('').forEach((_, index) => {
      setTimeout(() => {
        setAnimatedChars(prev => {
          const newAnimated = [...prev]
          newAnimated[index] = true
          return newAnimated
        })
      }, delay + (index * staggerDelay))
    })
  }, [text, isAnimating, delay, staggerDelay])

  return (
    <span className={className}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className={`inline-block transition-all duration-300 ease-out ${
            animatedChars[index] 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-2'
          }`}
          style={{
            transitionDelay: isAnimating ? `${index * staggerDelay}ms` : '0ms'
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  )
}