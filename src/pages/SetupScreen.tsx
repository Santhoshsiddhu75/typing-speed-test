import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Target, Play, Zap, Brain, Flame, ArrowLeft, User } from 'lucide-react'
import { TimerOption, DifficultyLevel } from '@/types'
import { cn } from '@/lib/utils'
import Logo from '@/components/Logo'
import { ThemeOnlyToggle } from '@/components/ThemeOnlyToggle'
import { useAuth } from '@/hooks/useAuth'

const SetupScreen = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [selectedTimer, setSelectedTimer] = useState<TimerOption | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)
  const [currentStep, setCurrentStep] = useState<'timer' | 'difficulty'>('timer')
  const [animatingTimer, setAnimatingTimer] = useState<TimerOption | null>(null)
  const [animatingDifficulty, setAnimatingDifficulty] = useState<DifficultyLevel | null>(null)
  const [buttonAnimation, setButtonAnimation] = useState<'none' | 'back-bounce-in' | 'start-slide-in' | 'start-exit'>('none')


  const timerOptions: { value: TimerOption; label: string; description: string }[] = [
    { value: 1, label: '1 Minute', description: 'Quick test' },
    { value: 2, label: '2 Minutes', description: 'Standard test' },
    { value: 5, label: '5 Minutes', description: 'Extended test' },
  ]

  const difficultyOptions: { 
    value: DifficultyLevel
    label: string
    description: string
    icon: typeof Zap
    color: string
  }[] = [
    { 
      value: 'easy', 
      label: 'Easy', 
      description: 'Simple words',
      icon: Zap,
      color: 'text-secondary'
    },
    { 
      value: 'medium', 
      label: 'Medium', 
      description: 'Technical vocabulary',
      icon: Brain,
      color: 'text-accent-foreground'
    },
    { 
      value: 'hard', 
      label: 'Hard', 
      description: 'Complex scientific text',
      icon: Flame,
      color: 'text-destructive'
    },
  ]

  const handleTimerSelect = (timer: TimerOption) => {
    setSelectedTimer(timer)
    setAnimatingTimer(timer)
    
    setTimeout(() => {
      setAnimatingTimer(null)
      setCurrentStep('difficulty')
      setButtonAnimation('back-bounce-in')
      setTimeout(() => setButtonAnimation('none'), 600)
    }, 100)
  }

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setSelectedDifficulty(difficulty)
    setAnimatingDifficulty(difficulty)
    setButtonAnimation('start-slide-in')
    setTimeout(() => {
      setAnimatingDifficulty(null)
      setButtonAnimation('none')
    }, 700)
  }

  const handleBack = () => {
    if (selectedDifficulty) {
      // If start button is visible, animate it out first
      setButtonAnimation('start-exit')
      setTimeout(() => {
        setCurrentStep('timer')
        setSelectedDifficulty(null)
        setButtonAnimation('none')
      }, 400)
    } else {
      // If start button not visible, just go back immediately
      setCurrentStep('timer')
      setSelectedDifficulty(null)
    }
  }

  const handleStartTest = () => {
    if (!selectedTimer || !selectedDifficulty) return
    
    const params = new URLSearchParams({
      timer: selectedTimer.toString(),
      difficulty: selectedDifficulty,
    })
    navigate(`/test?${params.toString()}`)
  }

  // Handle nested user object structure for derived values
  const actualUser = (user as any)?.user || user;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Top Navigation Bar */}
      <header 
        className="absolute top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm"
        role="banner"
        aria-label="Setup page header"
      >
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground p-1.5 sm:p-2 flex-shrink-0"
                aria-label="Navigate back to homepage"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" role="separator" aria-hidden="true" />
              <div className="min-w-0 flex-shrink">
                <Logo size="medium" showText={false} className="sm:hidden" />
                <Logo size="medium" className="hidden sm:flex" />
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {isAuthenticated && (
                <nav aria-label="Profile navigation">
                  <div className="flex items-center">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/profile')}
                        className="p-0"
                        aria-label="Go to profile"
                      >
                        <div 
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center border-2 bg-card/80 backdrop-blur-sm shadow-lg"
                          role="img"
                          aria-label={`${actualUser?.username || 'User'} profile picture`}
                        >
                          {actualUser?.profile_picture ? (
                            <img
                              src={actualUser.profile_picture}
                              alt={`${actualUser.username}'s profile picture`}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" aria-hidden="true" />
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                </nav>
              )}
              <ThemeOnlyToggle />
            </div>
          </div>
        </div>
      </header>
      {/* Large Background Circle centered */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
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
      
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 mt-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Typing Speed Test
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your preferred {currentStep === 'timer' ? 'time limit' : 'difficulty level'} to get started.
          </p>
        </div>

        {/* Selection Container */}
        <Card className="border-2 transition-all duration-300 hover:shadow-lg bg-muted/80">
          <CardHeader className="text-center relative">
            {/* Timer Header */}
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out",
              currentStep === 'timer' ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
            )}>
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Clock className="w-6 h-6" />
                Timer
              </CardTitle>
              <CardDescription className="mt-2">
                Choose how long you want to test your typing speed
              </CardDescription>
            </div>
            
            {/* Difficulty Header */}
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out",
              currentStep === 'difficulty' ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}>
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Target className="w-6 h-6" />
                Difficulty
              </CardTitle>
              <CardDescription className="mt-2">
                Select the complexity level of the text you'll be typing
              </CardDescription>
            </div>
            
            {/* Spacer for layout */}
            <div className="opacity-0 pointer-events-none">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Clock className="w-6 h-6" />
                Timer
              </CardTitle>
              <CardDescription className="mt-2">
                Choose how long you want to test your typing speed
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="relative">
            {/* Timer Options */}
            <div className={cn(
              "absolute inset-0 p-6 transition-all duration-500 ease-in-out",
              currentStep === 'timer' ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 pointer-events-none"
            )}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timerOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimerSelect(option.value)}
                    className={cn(
                      "selection-card text-left transition-all duration-200",
                      selectedTimer === option.value && "selection-card-active"
                    )}
                    data-testid={`timer-option-${option.value}`}
                    aria-pressed={selectedTimer === option.value}
                    aria-label={`Select ${option.label} timer`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-lg">{option.label}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                      <Clock className={cn(
                        "w-6 h-6 transition-all duration-200",
                        selectedTimer === option.value ? "text-primary" : "text-muted-foreground",
                        animatingTimer === option.value && "animate-timer-tick"
                      )} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Difficulty Options */}
            <div className={cn(
              "absolute inset-0 p-6 transition-all duration-500 ease-in-out",
              currentStep === 'difficulty' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"
            )}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {difficultyOptions.map((option) => {
                  const IconComponent = option.icon
                  const getAnimationClass = () => {
                    if (animatingDifficulty !== option.value) return ""
                    switch (option.value) {
                      case 'easy': return "animate-difficulty-bounce"
                      case 'medium': return "animate-difficulty-glow"
                      case 'hard': return "animate-difficulty-shake"
                      default: return ""
                    }
                  }
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleDifficultySelect(option.value)}
                      className={cn(
                        "selection-card text-left transition-all duration-200",
                        selectedDifficulty === option.value && "selection-card-active"
                      )}
                      data-testid={`difficulty-option-${option.value}`}
                      aria-pressed={selectedDifficulty === option.value}
                      aria-label={`Select ${option.label} difficulty`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-lg">{option.label}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                        <IconComponent className={cn(
                          "w-6 h-6 transition-all duration-200",
                          selectedDifficulty === option.value ? option.color : "text-muted-foreground",
                          getAnimationClass()
                        )} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Spacer for layout */}
            <div className="opacity-0 pointer-events-none p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timerOptions.map((option) => (
                  <div key={option.value} className="selection-card text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center items-center min-h-[44px] relative">
          {/* When both buttons are present */}
          {selectedDifficulty ? (
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBack}
                variant="outline"
                size="lg"
                className={cn(
                  "transition-all duration-300",
                  buttonAnimation === 'start-slide-in' && "animate-button-push-left",
                  buttonAnimation === 'start-exit' && "animate-button-center"
                )}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button 
                onClick={handleStartTest}
                size="lg"
                className={cn(
                  "transition-all duration-300 hover:scale-105 group",
                  buttonAnimation === 'start-slide-in' && "animate-button-slide-in",
                  buttonAnimation === 'start-exit' && "animate-button-exit-right"
                )}
                data-testid="start-test-button"
                aria-label="Start typing test"
              >
                <Play className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:animate-icon-select" />
                Start Test
              </Button>
            </div>
          ) : (
            /* When only back button is present - truly centered */
            currentStep === 'difficulty' && (
              <Button
                onClick={handleBack}
                variant="outline"
                size="lg"
                className={cn(
                  "transition-all duration-300",
                  buttonAnimation === 'back-bounce-in' && "animate-button-bounce-in"
                )}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )
          )}
        </div>

        {/* Summary - Commented out for now */}
        {/* <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                You've selected:
              </p>
              <div className="flex items-center justify-center gap-6 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {selectedTimer} minute{selectedTimer > 1 ? 's' : ''}
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {selectedDifficulty} difficulty
                </div>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}

export default SetupScreen