import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function calculateWPM(charactersTyped: number, timeInSeconds: number): number {
  if (timeInSeconds === 0) return 0
  return Math.round((charactersTyped / 5) / (timeInSeconds / 60))
}

export function calculateCPM(charactersTyped: number, timeInSeconds: number): number {
  if (timeInSeconds === 0) return 0
  return Math.round(charactersTyped / (timeInSeconds / 60))
}

export function calculateAccuracy(correctChars: number, totalChars: number): number {
  if (totalChars === 0) return 0
  return Math.round((correctChars / totalChars) * 100)
}