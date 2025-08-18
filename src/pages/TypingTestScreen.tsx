import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  RotateCcw, 
  Home, 
  CheckCircle2,
  Save,
  AlertTriangle
} from 'lucide-react'
import { TimerOption, DifficultyLevel, TypingStats, CharacterState, TestResult } from '@/types'
import { getRandomText } from '@/data/texts'
import { formatTime, calculateWPM, calculateCPM, calculateAccuracy } from '@/lib/utils'
import { saveTypingTestResult } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { SplitText } from '@/components/SplitText'
import { TypingWaveform } from '@/components/TypingWaveform'
import { Toggle } from '@/components/ui/toggle'
import { CircularTimer } from '@/components/CircularTimer'
import Navbar from '@/components/Navbar'
import { ThemeToggle } from '@/components/ThemeToggle'
import AdBanner from '@/components/AdBanner'

const TypingTestScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAuth()
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
  
  // Save and confirmation state
  const [isSaving, setIsSaving] = useState(false)
  const [isResultSaved, setIsResultSaved] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Real-time typing speed tracking
  const [realtimeTypingSpeed, setRealtimeTypingSpeed] = useState(0)
  const lastKeypressTimeRef = useRef<number>(0)
  const typingSpeedHistoryRef = useRef<number[]>([])
  
  // Waveform visibility toggle
  const [showWaveform, setShowWaveform] = useState(true)
  
  // Statistics
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    cpm: 0,
    accuracy: 0,
    timeRemaining: timer * 60,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0
  })

  // Measure actual character width more reliably
  const getCharWidth = useCallback(() => {
    if (!measureCharRef.current) return 16 // fallback
    const totalWidth = measureCharRef.current.getBoundingClientRect().width
    // Divide by 5 since we're measuring "abcde" (5 characters)
    const avgCharWidth = totalWidth / 5
    return avgCharWidth || 16 // fallback if getBoundingClientRect fails
  }, [])

  // Calculate scroll position for smooth scrolling effect
  const calculateScrollOffset = useCallback(() => {
    if (!textContainerRef.current || currentIndex === 0) return 0
    
    const container = textContainerRef.current
    const containerWidth = container.offsetWidth
    const centerPosition = containerWidth / 2
    const charWidth = getCharWidth()
    
    // More accurate character position calculation
    const currentCharPosition = currentIndex * charWidth
    
    // Keep current character centered, but don't scroll past the beginning
    const targetScrollPosition = currentCharPosition - centerPosition + (charWidth / 2)
    const scrollAmount = Math.max(0, targetScrollPosition)
    
    // Add some padding for mobile - ensure we don't get too close to edges
    const mobilePadding = containerWidth < 768 ? 40 : 20
    const adjustedScroll = Math.max(0, scrollAmount - mobilePadding)
    
    return adjustedScroll
  }, [currentIndex, getCharWidth])

  // Update scroll offset when current index changes
  useEffect(() => {
    const newOffset = calculateScrollOffset()
    setScrollOffset(newOffset)
  }, [currentIndex, calculateScrollOffset])

  // Recalculate scroll on window resize (important for mobile orientation changes)
  useEffect(() => {
    const handleResize = () => {
      const newOffset = calculateScrollOffset()
      setScrollOffset(newOffset)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculateScrollOffset])

  // Prevent any keyboard interactions when results dialog is open
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showResults) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    if (showResults) {
      document.addEventListener('keydown', handleGlobalKeyDown, true)
      return () => document.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [showResults])

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


  // Faster decay when not typing for better waveform responsiveness
  useEffect(() => {
    const decayInterval = setInterval(() => {
      if (isTestActive) {
        const timeSinceLastKeypress = Date.now() - lastKeypressTimeRef.current
        if (timeSinceLastKeypress > 300) { // Faster threshold - 300ms instead of 1000ms
          setRealtimeTypingSpeed(prev => prev * 0.85) // More aggressive decay - 15% every 50ms
        }
      } else {
        setRealtimeTypingSpeed(prev => prev * 0.8) // Even faster decay when test is inactive
      }
    }, 50) // Update more frequently for smoother decay

    return () => clearInterval(decayInterval)
  }, [isTestActive])

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

  // Detect back navigation and generate new text if test is complete
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTestComplete) {
        // User returned to a completed test - generate new text to prevent cheating
        console.log('User returned to completed test - generating new text')
        
        // Generate new text
        const newText = getRandomText(difficulty, timer)
        setTestText(newText)
        
        // Reset all test state
        setCurrentIndex(0)
        setUserInput('')
        setIsTestActive(false)
        setIsTestComplete(false)
        setShowResults(false)
        setTimeRemaining(timer * 60)
        setStartTime(null)
        setStats({
          wpm: 0,
          cpm: 0,
          accuracy: 100,
          timeRemaining: timer * 60,
          correctChars: 0,
          incorrectChars: 0,
          totalChars: 0
        })
        
        // Reset save state
        setIsResultSaved(false)
        setIsSaving(false)
        setSaveError(null)
        
        // Reset typing speed tracking
        setRealtimeTypingSpeed(0)
        typingSpeedHistoryRef.current = []
        lastKeypressTimeRef.current = 0
        
        // Focus the text container
        setTimeout(() => {
          if (textContainerRef.current) {
            textContainerRef.current.focus()
          }
        }, 100)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isTestComplete, difficulty, timer])

  // Handle key events directly on text container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isTestComplete || showResults) return

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
      const currentTime = Date.now()
      
      // Calculate real-time typing speed (characters per second) with better responsiveness
      if (lastKeypressTimeRef.current > 0) {
        const timeDiff = (currentTime - lastKeypressTimeRef.current) / 1000 // Convert to seconds
        const instantSpeed = timeDiff > 0 ? 1 / timeDiff : 0 // Characters per second
        
        // Use smaller window for more responsive feedback (3 keystrokes instead of 5)
        typingSpeedHistoryRef.current.push(instantSpeed)
        if (typingSpeedHistoryRef.current.length > 3) {
          typingSpeedHistoryRef.current.shift()
        }
        
        // Weight recent keystrokes more heavily for immediate response
        let weightedSum = 0
        let totalWeight = 0
        typingSpeedHistoryRef.current.forEach((speed, index) => {
          const weight = Math.pow(1.5, index) // More recent = higher weight
          weightedSum += speed * weight
          totalWeight += weight
        })
        
        const weightedAvgSpeed = totalWeight > 0 ? weightedSum / totalWeight : 0
        setRealtimeTypingSpeed(weightedAvgSpeed)
      } else {
        // First keystroke - immediate response
        const instantSpeed = 4 // Assume moderate speed for first keystroke
        setRealtimeTypingSpeed(instantSpeed)
      }
      
      lastKeypressTimeRef.current = currentTime
      
      // Start test on first keystroke
      if (!isTestActive && !isTestComplete) {
        setIsTestActive(true)
        setStartTime(currentTime)
      }
      
      // Allow typing up to the text length
      if (newValue.length <= testText.length) {
        setUserInput(newValue)
        setCurrentIndex(newValue.length)
      }
    }
  }

  const handleSaveResult = async () => {
    // Debug logging
    console.log('handleSaveResult called');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user);
    console.log('user?.username:', user?.username);
    
    // Handle nested user object structure
    const actualUser = (user as any)?.user || user;
    const username = actualUser?.username;
    
    if (!isAuthenticated || !username) {
      console.error('Authentication check failed:', { isAuthenticated, user, username });
      setSaveError('You must be logged in to save results')
      return
    }

    try {
      setIsSaving(true)
      setSaveError(null)
      
      const resultToSave: TestResult = {
        wpm: stats.wpm,
        cpm: stats.cpm,
        accuracy: stats.accuracy,
        totalTime: timer * 60 - timeRemaining,
        difficulty,
        totalChars: stats.totalChars,
        correctChars: stats.correctChars,
        incorrectChars: stats.incorrectChars
      }
      
      await saveTypingTestResult(resultToSave, username)
      setIsResultSaved(true)
      
    } catch (error) {
      console.error('Failed to save result:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save result')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBackToSetup = () => {
    if (!isResultSaved && isAuthenticated) {
      setShowUnsavedWarning(true)
    } else {
      navigate('/')
    }
  }

  const handleConfirmBackWithoutSaving = () => {
    setShowUnsavedWarning(false)
    navigate('/')
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
    setRealtimeTypingSpeed(0)
    lastKeypressTimeRef.current = 0
    typingSpeedHistoryRef.current = []
    
    // Reset save state
    setIsSaving(false)
    setIsResultSaved(false)
    setShowUnsavedWarning(false)
    setSaveError(null)
    
    setStats({
      wpm: 0,
      cpm: 0,
      accuracy: 0,
      timeRemaining: timer * 60,
      correctChars: 0,
      incorrectChars: 0,
      totalChars: 0
    })
    if (textContainerRef.current) {
      textContainerRef.current.focus()
    }
  }

  const testResult: TestResult = {
    wpm: stats.wpm,
    cpm: stats.cpm,
    accuracy: stats.accuracy,
    totalTime: timer * 60 - timeRemaining,
    difficulty
  }

  // Handle nested user object structure for derived values
  const actualUser = (user as any)?.user || user;

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <Navbar backUrl="/" />
      {/* Large Background Circle centered on timer */}
      <div className="absolute inset-0 flex items-start justify-center pt-[200px] md:pt-[220px] z-0">
        <div 
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '180vh',
            height: '180vh',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            boxShadow: '0 0 80px rgba(34, 197, 94, 0.3), 0 0 160px rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.1)'
          }}
        />
      </div>
      
      {/* Bottom Right Corner Circle */}
      <div className="fixed z-0" style={{ bottom: '-65vh', right: '-55vh' }}>
        <div 
          className="rounded-full pointer-events-none"
          style={{
            width: '100vh',
            height: '100vh',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            boxShadow: '0 0 60px rgba(34, 197, 94, 0.3), 0 0 120px rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.1)'
          }}
        />
      </div>
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Content Area */}
        <div className="pt-16 sm:pt-20 md:pt-24"></div>

        {/* Stats Display */}
        <div className="flex items-center justify-center max-w-2xl mx-auto gap-3 sm:gap-6 md:gap-8">
          {/* WPM - Left */}
          <Card className="w-20 sm:w-24 h-12 sm:h-14 flex items-center justify-center flex-shrink-0 bg-white dark:bg-[rgb(28,46,56)] border border-border rounded-lg shadow-md">
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold" data-testid="wpm-display">{stats.wpm}</p>
              <p className="text-xs text-muted-foreground">WPM</p>
            </div>
          </Card>
          
          {/* Circular Timer - Center */}
          <div className="flex-shrink-0">
            <CircularTimer 
              timeRemaining={timeRemaining}
              totalTime={timer * 60}
            />
          </div>
          
          {/* Accuracy - Right */}
          <Card className="w-20 sm:w-24 h-12 sm:h-14 flex items-center justify-center flex-shrink-0 bg-white dark:bg-[rgb(28,46,56)] border border-border rounded-lg shadow-md">
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold" data-testid="accuracy-display">{stats.accuracy}%</p>
              <p className="text-xs text-muted-foreground truncate">Accuracy</p>
            </div>
          </Card>
        </div>

        {/* Typing Waveform Visualizer */}
        <div className="relative">
          {/* Toggle Switch */}
          <div className="absolute top-2 right-2 z-10">
            <Toggle
              checked={showWaveform}
              onCheckedChange={setShowWaveform}
              size="sm"
              className="bg-background/80 backdrop-blur-sm border border-border/50"
            />
          </div>
          
          {/* Waveform */}
          {showWaveform && (
            <TypingWaveform 
              typingSpeed={realtimeTypingSpeed}
              isActive={isTestActive}
              className="h-20"
            />
          )}
          
          {/* Placeholder when hidden */}
          {!showWaveform && (
            <div className="h-20 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
              <span className="text-sm text-muted-foreground">Waveform visualizer disabled</span>
            </div>
          )}
        </div>

        {/* Typing Area */}
        <Card className="border-2 bg-white dark:bg-[rgb(28,46,56)]">
          <CardHeader>
            <div className="flex items-center">
              <div className="flex-1"></div>
              <CardTitle className="text-center whitespace-nowrap text-sm sm:text-base md:text-xl">Type the text below</CardTitle>
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
                  stroke="rgb(34, 197, 94)"
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
              
              {/* Hidden character for measuring width - using average character */}
              <span 
                ref={measureCharRef}
                className="typing-char absolute opacity-0 pointer-events-none"
                style={{ top: '-9999px', left: '-9999px' }}
              >
                abcde
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
        <Dialog open={showResults} onOpenChange={() => {/* Prevent accidental closing */}}>
          <DialogContent 
            className="w-[90vw] max-w-md mx-auto" 
            data-testid="results-modal"
            hideCloseButton={true}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                Test Complete!
              </DialogTitle>
              <DialogDescription>
                Here are your TapTest results
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

            {/* Save Error Display */}
            {saveError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{saveError}</p>
              </div>
            )}

            {/* Success Message */}
            {isResultSaved && (
              <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Result saved successfully!
                  </p>
                </div>
              </div>
            )}

            {/* Advertisement - Results Modal */}
            <div className="py-4 flex justify-center">
              <AdBanner 
                size="rectangle" 
                slot="results-modal-ad"
                className="mx-auto"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3">
              {/* Save Result Button / Check Profile Button */}
              {isAuthenticated && (
                <Button 
                  onClick={isResultSaved ? () => navigate('/profile') : handleSaveResult} 
                  disabled={isSaving}
                  className={`w-full transition-all duration-500 ease-in-out transform ${
                    isResultSaved 
                      ? 'scale-105' 
                      : 'scale-100'
                  }`}
                  variant={isResultSaved ? "outline" : "default"}
                  data-testid={isResultSaved ? "check-profile-button" : "save-result-button"}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : isResultSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 animate-pulse" />
                      Check Profile
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Result
                    </>
                  )}
                </Button>
              )}

              {/* Back to Setup Button */}
              <Button 
                onClick={handleBackToSetup} 
                variant={isAuthenticated && !isResultSaved ? "outline" : "default"}
                className="w-full"
                data-testid="back-to-setup-button"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Setup
              </Button>

              {/* Show login prompt if not authenticated */}
              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground text-center w-full">
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/login')}
                    className="p-0 h-auto text-xs"
                  >
                    Log in
                  </Button>
                  {' '}to save your results to your profile
                </p>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsaved Results Warning Dialog */}
        <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
          <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                Unsaved Results
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                You haven't saved your test results yet. Your performance data will be lost if you continue.
                <br /><br />
                <strong>Your Results:</strong>
                <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>WPM:</strong> {testResult.wpm}</div>
                    <div><strong>Accuracy:</strong> {testResult.accuracy}%</div>
                    <div><strong>Time:</strong> {formatTime(Math.round(testResult.totalTime))}</div>
                    <div><strong>Difficulty:</strong> {testResult.difficulty}</div>
                  </div>
                </div>
                <br />
                Would you like to go back and save your results first?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3">
              <AlertDialogCancel 
                onClick={handleConfirmBackWithoutSaving}
                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Discard Results
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => setShowUnsavedWarning(false)}
                className="w-full"
              >
                No, Keep Results
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export default TypingTestScreen
