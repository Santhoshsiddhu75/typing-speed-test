import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Target, Play, Zap, Brain, Flame } from 'lucide-react'
import { TimerOption, DifficultyLevel } from '@/types'
import { cn } from '@/lib/utils'

const SetupScreen = () => {
  const navigate = useNavigate()
  const [selectedTimer, setSelectedTimer] = useState<TimerOption>(1)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('easy')
  const [animatingTimer, setAnimatingTimer] = useState<TimerOption | null>(null)
  const [animatingDifficulty, setAnimatingDifficulty] = useState<DifficultyLevel | null>(null)

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
      description: 'Simple words and sentences',
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
    setTimeout(() => setAnimatingTimer(null), 800)
  }

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setSelectedDifficulty(difficulty)
    setAnimatingDifficulty(difficulty)
    setTimeout(() => setAnimatingDifficulty(null), 700)
  }

  const handleStartTest = () => {
    const params = new URLSearchParams({
      timer: selectedTimer.toString(),
      difficulty: selectedDifficulty,
    })
    navigate(`/test?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Typing Speed Test
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Test your typing speed and accuracy. Choose your preferred time limit and difficulty level to get started.
          </p>
        </div>

        {/* Timer Selection */}
        <Card className="border-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Clock className="w-6 h-6" />
              Timer
            </CardTitle>
            <CardDescription>
              Choose how long you want to test your typing speed
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    <div>
                      <div className="font-semibold text-lg">{option.label}</div>
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
          </CardContent>
        </Card>

        {/* Difficulty Selection */}
        <Card className="border-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Target className="w-6 h-6" />
              Difficulty
            </CardTitle>
            <CardDescription>
              Select the complexity level of the text you'll be typing
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      <div>
                        <div className="font-semibold text-lg">{option.label}</div>
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
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button 
            onClick={handleStartTest}
            size="xl"
            className="min-w-48 transition-all duration-300 hover:scale-105 group"
            data-testid="start-test-button"
            aria-label="Start typing test"
          >
            <Play className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:animate-icon-select" />
            Start Test
          </Button>
        </div>

        {/* Summary */}
        <Card className="bg-muted/50 border-dashed">
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
        </Card>
      </div>
    </div>
  )
}

export default SetupScreen