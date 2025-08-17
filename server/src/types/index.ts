import { z } from 'zod';

// Security validation helpers
const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters long')
  .max(20, 'Username must be no more than 20 characters long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refine(val => !['admin', 'root', 'api', 'test', 'null', 'undefined', 'system'].includes(val.toLowerCase()), 
    'This username is reserved and cannot be used');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

// Database Models
export interface User {
  id: number;
  username: string;
  password_hash?: string;
  google_id?: string;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
}

export interface TestResult {
  id: number;
  username: string;
  wpm: number;
  cpm: number;
  accuracy: number;
  total_time: number;
  difficulty: 'easy' | 'medium' | 'hard';
  total_characters: number;
  correct_characters: number;
  incorrect_characters: number;
  test_text?: string;
  created_at: string;
}

// Validation Schemas
export const CreateTestResultSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  wpm: z.number().min(0).max(500),
  cpm: z.number().min(0).max(2500),
  accuracy: z.number().min(0).max(100),
  total_time: z.number().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  total_characters: z.number().min(1),
  correct_characters: z.number().min(0),
  incorrect_characters: z.number().min(0),
  test_text: z.string().optional(),
});

export type CreateTestResultRequest = z.infer<typeof CreateTestResultSchema>;

export const GetTestResultsSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export type GetTestResultsRequest = z.infer<typeof GetTestResultsSchema>;

// Authentication Schemas
export const RegisterRequestSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
}).strict();

export const LoginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
}).strict();

export const GoogleAuthRequestSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
}).strict();

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
}).strict();

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).strict();

// Request types
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: any[];
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Statistics Types (for future use)
export interface UserStats {
  username: string;
  total_tests: number;
  average_wpm: number;
  average_accuracy: number;
  best_wpm: number;
  best_accuracy: number;
  total_time_spent: number;
  improvement_trend: {
    wpm_change: number;
    accuracy_change: number;
  };
  difficulty_breakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
}