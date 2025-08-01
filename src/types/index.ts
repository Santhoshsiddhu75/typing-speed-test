export type TimerOption = 1 | 2 | 5

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface TestSettings {
  timer: TimerOption
  difficulty: DifficultyLevel
}

export interface TypingStats {
  wpm: number
  cpm: number
  accuracy: number
  timeRemaining: number
  correctChars: number
  incorrectChars: number
  totalChars: number
}

export interface CharacterState {
  char: string
  status: 'upcoming' | 'current' | 'correct' | 'incorrect'
  isSpace?: boolean
}

export interface TestResult {
  wpm: number
  cpm: number
  accuracy: number
  totalTime: number
  difficulty: DifficultyLevel
}