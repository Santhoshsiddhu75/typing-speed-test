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
  id?: number
  wpm: number
  cpm: number
  accuracy: number
  totalTime: number
  difficulty: DifficultyLevel
  totalChars?: number
  correctChars?: number
  incorrectChars?: number
  created_at?: string
  username?: string
}

export interface UserStats {
  username: string
  total_tests: number
  average_wpm: number
  average_accuracy: number
  best_wpm: number
  best_accuracy: number
  total_time_spent: number
  improvement_trend: {
    wpm_change: number
    accuracy_change: number
  }
  difficulty_breakdown: {
    easy: number
    medium: number
    hard: number
  }
}

// Authentication Types
export interface User {
  id: string
  username?: string
  googleId?: string
  profilePicture?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthData {
  username: string
  password: string
}

export interface RegisterData extends AuthData {
  confirmPassword: string
  acceptTerms: boolean
}

export interface LoginData extends AuthData {
  rememberMe: boolean
}