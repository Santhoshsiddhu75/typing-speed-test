import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Type, 
  Target, 
  RotateCcw, 
  Home, 
  Activity,
  Timer,
  CheckCircle2
} from 'lucide-react'
import { TimerOption, DifficultyLevel, TypingStats, CharacterState, TestResult } from '@/types'
import { getRandomText } from '@/data/texts'
import { formatTime, calculateWPM, calculateCPM, calculateAccuracy } from '@/lib/utils'
import { SplitText } from '@/components/SplitText'

const TypingTestScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const textContainerRef = useRef<HTMLDivElement>(null)
  const measureCharRef = useRef<HTMLSpanElement>(null)
  
  // Test configuration
  const timer = parseInt(searchParams.get('timer') || '1') as TimerOption
  const difficulty = (searchParams.get('difficulty') || 'easy') as DifficultyLevel
  const [testText, setTestText] = useState(() => getRandomText(difficulty, timer))
  
  // Test state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [isTestActive, setIsTestActive] = useState(false)
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(timer * 60)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [showSplitAnimation, setShowSplitAnimation] = useState(false)
  const [isFieldFocused, setIsFieldFocused] = useState(false)
  const [isCapsLockOn, setIsCapsLockOn] = useState(false)
  
  // Statistics
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    cpm: 0,
    accuracy: 100,
    timeRemaining: timer * 60,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0
  })

  // Measure actual character width
  const getCharWidth = useCallback(() => {
    if (!measureCharRef.current) return 16 // fallback
    return measureCharRef.current.offsetWidth
  }, [])

  // Calculate scroll position for smooth scrolling effect
  const calculateScrollOffset = useCallback(() => {
    if (!textContainerRef.current) return 0
    
    const containerWidth = textContainerRef.current.offsetWidth
    const centerPosition = containerWidth / 2
    const charWidth = getCharWidth()
    
    // Calculate the exact position where current character should be centered
    const currentCharPosition = currentIndex * charWidth
    
    // Scroll to keep current character at center
    const scrollAmount = Math.max(0, currentCharPosition - centerPosition + (charWidth / 2))
    
    return scrollAmount
  }, [currentIndex, getCharWidth])

  // Update scroll offset when current index changes
  useEffect(() => {
    const newOffset = calculateScrollOffset()
    setScrollOffset(newOffset)
  }, [currentIndex, calculateScrollOffset])

  // Trigger split animation on page load
  useEffect(() => {
    setShowSplitAnimation(true)
    // Stop animation after 1.5 seconds (much faster)
    setTimeout(() => setShowSplitAnimation(false), 1500)
  }, [])

  // Process text into characters with state
  const processText = useCallback((): CharacterState[] => {
    return testText.split('').map((char, index) => {
      let status: CharacterState['status'] = 'upcoming'
      
      if (index < currentIndex) {
        // Check if the typed character matches
        status = userInput[index] === char ? 'correct' : 'incorrect'
      } else if (index === currentIndex && (isFieldFocused || isTestActive)) {
        status = 'current'
      }
      
      return {
        char,
        status,
        isSpace: char === ' '
      }
    })
  }, [testText, currentIndex, userInput, isTestActive, isFieldFocused])

  const characters = processText()

  // Get first few words for split animation (more words now)
  const getInitialWords = useCallback(() => {
    const words = testText.split(' ')
    let charCount = 0
    let wordsToShow = []
    
    for (let i = 0; i < words.length; i++) {
      charCount += words[i].length + 1 // +1 for space
      wordsToShow.push(words[i])
      
      // Stop when we have about 100-120 characters (more words + 5 extra)
      if (charCount > 100) break
    }
    
    return wordsToShow.join(' ')
  }, [testText])

  const initialText = getInitialWords()
  const initialTextLength = initialText.length

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isTestActive && timeRemaining > 0 && !isTestComplete) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsTestActive(false)
            setIsTestComplete(true)
            setShowResults(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTestActive, timeRemaining, isTestComplete])

  // Update statistics
  useEffect(() => {
    const correctChars = userInput.split('').filter((char, index) => char === testText[index]).length
    const incorrectChars = Math.max(0, userInput.length - correctChars)
    const totalChars = userInput.length
    const timeElapsed = startTime ? (Date.now() - startTime) / 1000 : 0
    
    setStats({
      wpm: calculateWPM(correctChars, timeElapsed),
      cpm: calculateCPM(correctChars, timeElapsed),
      accuracy: calculateAccuracy(correctChars, totalChars),
      timeRemaining,
      correctChars,
      incorrectChars,
      totalChars
    })
  }, [userInput, testText, timeRemaining, startTime])


  // Focus text container on mount and when test starts
  useEffect(() => {
    if (textContainerRef.current) {
      textContainerRef.current.focus()
    }
  }, [])

  // Handle key events directly on text container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isTestComplete) return

    // Check caps lock status on every key press
    setIsCapsLockOn(e.getModifierState('CapsLock'))

    if (e.key === 'Backspace') {
      e.preventDefault()
      if (userInput.length > 0) {
        const newValue = userInput.slice(0, -1)
        setUserInput(newValue)
        setCurrentIndex(newValue.length)
      }
    } else if (e.key.length === 1) {
      // Handle regular character input
      e.preventDefault()
      const newValue = userInput + e.key
      
      // Start test on first keystroke
      if (!isTestActive && !isTestComplete) {
        setIsTestActive(true)
        setStartTime(Date.now())
      }
      
      // Allow typing up to the text length
      if (newValue.length <= testText.length) {
        setUserInput(newValue)
        setCurrentIndex(newValue.length)
      }
    }
  }

  const handleRetakeTest = () => {
    // Generate new text for retry
    setTestText(getRandomText(difficulty, timer))
    
    // Reset all test state
    setCurrentIndex(0)
    setUserInput('')
    setIsTestActive(false)
    setIsTestComplete(false)
    setShowResults(false)
    setTimeRemaining(timer * 60)
    setStartTime(null)
    setScrollOffset(0)
    setShowSplitAnimation(false)
    setIsFieldFocused(false)
    setStats({
      wpm: 0,
      cpm: 0,
      accuracy: 100,
      timeRemaining: timer * 60,
      correctChars: 0,
      incorrectChars: 0,
      totalChars: 0
    })
    if (textContainerRef.current) {
      textContainerRef.current.focus()
    }
  }

  const handleReturnToSetup = () => {
    navigate('/')
  }

  const testResult: TestResult = {
    wpm: stats.wpm,
    cpm: stats.cpm,
    accuracy: stats.accuracy,
    totalTime: timer * 60 - timeRemaining,
    difficulty
  }

  const progressPercentage = ((timer * 60 - timeRemaining) / (timer * 60)) * 100

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Typing Speed Test</h1>
            <p className="text-muted-foreground">
              {timer} minute{timer > 1 ? 's' : ''} • {difficulty} difficulty
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleReturnToSetup}
            className="w-full sm:w-auto"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Setup
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="wpm-display">{stats.wpm}</p>
                <p className="text-xs text-muted-foreground">WPM</p>
              </div>
              <Type className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="cpm-display">{stats.cpm}</p>
                <p className="text-xs text-muted-foreground">CPM</p>
              </div>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="accuracy-display">{stats.accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <Target className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="timer-display">
                  {formatTime(timeRemaining)}
                </p>
                <p className="text-xs text-muted-foreground">Time Left</p>
              </div>
              <Timer className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Typing Area */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex-1"></div>
              <CardTitle className="text-center flex-1">Type the text below</CardTitle>
              <div className="flex-1 flex justify-end">
                {/* Caps Lock Indicator */}
                <div 
                  className={`px-3 py-1 rounded-md text-white text-sm font-mono font-bold transition-colors duration-150 ${
                    isCapsLockOn 
                      ? 'bg-green-500' 
                      : 'bg-gray-400'
                  }`}
                  title={isCapsLockOn ? 'Caps Lock is ON' : 'Caps Lock is OFF'}
                >
                  {isCapsLockOn ? 'A' : 'a'}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scrolling Text Display - Now acts as input field */}
            <div 
              ref={textContainerRef}
              className="typing-text h-24 p-6 bg-muted/20 rounded-lg overflow-hidden relative cursor-text"
              data-testid="typing-area"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFieldFocused(true)}
              onBlur={() => setIsFieldFocused(false)}
              style={{
                border: 'none',
                outline: 'none'
              }}
            >
              {/* Animated dotted border using SVG */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ borderRadius: '0.5rem' }}
              >
                <rect
                  x="1"
                  y="1"
                  width="calc(100% - 2px)"
                  height="calc(100% - 2px)"
                  rx="8"
                  ry="8"
                  fill="none"
                  stroke="rgb(208, 79, 153)"
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  strokeDashoffset="0"
                  className={!isFieldFocused ? 'animate-marching-ants' : ''}
                  style={{
                    opacity: 0.6
                  }}
                />
              </svg>
              {/* Center line indicator */}
              <div className="absolute top-0 left-1/2 w-px h-full bg-primary/30 pointer-events-none z-10"></div>
              
              {/* Hidden character for measuring width */}
              <span 
                ref={measureCharRef}
                className="typing-char absolute opacity-0 pointer-events-none"
                style={{ top: '-9999px' }}
              >
                M
              </span>
              
              {/* Scrolling text container */}
              <div 
                className="absolute top-6 left-6 whitespace-nowrap transition-transform duration-150 ease-out will-change-transform"
                style={{
                  transform: `translateX(-${scrollOffset}px)`
                }}
              >
                {!showSplitAnimation ? (
                  // Normal rendering after animation
                  characters.map((charData, index) => {
                    let className = 'typing-char inline-block '
                    let displayChar = charData.char
                    
                    switch (charData.status) {
                      case 'correct':
                        className += 'typing-char-correct'
                        break
                      case 'incorrect':
                        className += 'typing-char-incorrect'
                        // Show what user actually typed when incorrect
                        displayChar = userInput[index] || charData.char
                        break
                      case 'current':
                        className += 'typing-char-current'
                        break
                      case 'upcoming':
                        className += 'typing-char-upcoming'
                        break
                    }
                    
                    return (
                      <span
                        key={index}
                        className={className}
                        data-testid={`char-${index}`}
                      >
                        {displayChar === ' ' ? '\u00A0' : displayChar}
                      </span>
                    )
                  })
                ) : (
                  // Split text animation for initial visible text
                  <div className="inline-block">
                    <SplitText
                      text={initialText}
                      isAnimating={showSplitAnimation}
                      staggerDelay={7}
                      className="typing-char-upcoming"
                    />
                    {/* Show remaining text without animation */}
                    <span className="typing-char-upcoming opacity-30">
                      {testText.slice(initialTextLength)}
                    </span>
                  </div>
                )}
              </div>
            </div>


            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleRetakeTest}
                variant="outline"
                className="w-full sm:w-auto"
                data-testid="retake-button"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Modal */}
        <Dialog open={showResults} onOpenChange={setShowResults}>
          <DialogContent className="w-[90vw] max-w-md mx-auto" data-testid="results-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                Test Complete!
              </DialogTitle>
              <DialogDescription>
                Here are your typing test results
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold text-primary" data-testid="final-wpm">
                    {testResult.wpm}
                  </div>
                  <div className="text-sm text-muted-foreground">Words per Minute</div>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold text-primary" data-testid="final-cpm">
                    {testResult.cpm}
                  </div>
                  <div className="text-sm text-muted-foreground">Characters per Minute</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold" data-testid="final-accuracy">
                    {testResult.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold" data-testid="final-time">
                    {formatTime(Math.round(testResult.totalTime))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Time</div>
                </div>
              </div>
              
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-sm font-medium">
                  Difficulty: <span className="capitalize">{testResult.difficulty}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleRetakeTest} 
                variant="outline" 
                className="w-full"
                data-testid="retake-modal-button"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Test
              </Button>
              <Button 
                onClick={handleReturnToSetup} 
                className="w-full"
                data-testid="return-setup-button"
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Setup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default TypingTestScreen