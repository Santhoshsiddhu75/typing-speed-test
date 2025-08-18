import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { User } from '../types/index.js';

// Load environment variables
dotenv.config();

// Security Configuration - OWASP compliant
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!');
  return crypto.randomBytes(64).toString('hex');
})();

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (() => {
  console.warn('⚠️  WARNING: Using default JWT refresh secret. Set JWT_REFRESH_SECRET environment variable in production!');
  return crypto.randomBytes(64).toString('hex');
})();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access tokens
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Longer refresh tokens
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// Rate limiting configuration - Relaxed for development/testing
export const AUTH_RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 attempts per 15 minutes
  register: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 attempts per 15 minutes (was 3 per hour)
  refresh: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 refreshes per 15 minutes
};

// JWT payload interfaces
export interface JWTPayload {
  userId: number;
  username: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for token blacklisting
}

export interface RefreshTokenPayload extends JWTPayload {
  type: 'refresh';
}

// Security contexts
export interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

// Authentication utilities
export class AuthUtils {
  
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error comparing password:', error);
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate access token for user
   * SECURITY: Short-lived access tokens (15 minutes) for better security
   */
  static generateAccessToken(user: Pick<User, 'id' | 'username'>, context?: SecurityContext): string {
    try {
      const jti = crypto.randomUUID(); // Unique token ID for blacklisting
      const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        type: 'access',
        jti
      };

      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'typing-speed-test-api',
        audience: 'typing-speed-test-app',
        algorithm: 'HS256'
      } as jwt.SignOptions);
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Generate refresh token for user
   * SECURITY: Longer-lived refresh tokens (7 days) with rotation
   */
  static generateRefreshToken(user: Pick<User, 'id' | 'username'>, context?: SecurityContext): string {
    try {
      const jti = crypto.randomUUID();
      const payload: RefreshTokenPayload = {
        userId: user.id,
        username: user.username,
        type: 'refresh',
        jti
      };

      return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'typing-speed-test-api',
        audience: 'typing-speed-test-app',
        algorithm: 'HS256'
      } as jwt.SignOptions);
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(user: Pick<User, 'id' | 'username'>, context?: SecurityContext): {
    accessToken: string;
    refreshToken: string;
  } {
    return {
      accessToken: this.generateAccessToken(user, context),
      refreshToken: this.generateRefreshToken(user, context)
    };
  }

  /**
   * Verify access token
   * SECURITY: Validates token signature, expiry, issuer, and audience
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'typing-speed-test-api',
        audience: 'typing-speed-test-app',
        algorithms: ['HS256']
      }) as JWTPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid authentication token');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Authentication token has expired');
      } else {
        console.error('Access token verification error:', error);
        throw new Error('Failed to verify authentication token');
      }
    }
  }

  /**
   * Verify refresh token
   * SECURITY: Uses separate secret for refresh tokens
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'typing-speed-test-api',
        audience: 'typing-speed-test-app',
        algorithms: ['HS256']
      }) as RefreshTokenPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else {
        console.error('Refresh token verification error:', error);
        throw new Error('Failed to verify refresh token');
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7); // Remove "Bearer " prefix
  }

  /**
   * Validate password strength - OWASP compliant
   * SECURITY: Enhanced password requirements following OWASP guidelines
   */
  static validatePassword(password: string): { valid: boolean; errors: string[]; score: number } {
    const errors: string[] = [];
    let score = 0;
    
    // Length requirements
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (password.length >= 8) {
      score += 10;
    }
    
    if (password.length >= 12) {
      score += 10;
    }
    
    // Character requirements
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 15;
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 15;
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 15;
    }
    
    // Special characters (recommended but not required)
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15;
    }
    
    // Complexity checks
    if (password.length > 16) {
      score += 10;
    }
    
    // Common password patterns (security weakness)
    const commonPatterns = [
      /123456|password|qwerty|abc123|admin|letmein/i,
      /(.)\1{2,}/, // Repeated characters
      /^[a-zA-Z]+$|^\d+$/, // Only letters or only numbers
    ];
    
    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns that make it vulnerable');
      score -= 20;
    }

    return {
      valid: errors.length === 0,
      errors,
      score: Math.max(0, Math.min(100, score))
    };
  }

  /**
   * Validate username format
   */
  static validateUsername(username: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    
    if (username.length > 20) {
      errors.push('Username must be no more than 20 characters long');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
    
    // Check for reserved usernames
    const reservedUsernames = ['admin', 'root', 'api', 'test', 'null', 'undefined', 'system'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      errors.push('This username is reserved and cannot be used');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a cryptographically secure random string
   * SECURITY: Uses crypto.randomBytes for cryptographic security
   */
  static generateSecureRandom(length: number = 32): string {
    try {
      return crypto.randomBytes(length).toString('hex').substring(0, length);
    } catch (error) {
      console.error('Error generating secure random string:', error);
      throw new Error('Failed to generate secure random string');
    }
  }

  /**
   * Generate CSRF token
   * SECURITY: Cryptographically secure token for CSRF protection
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Sanitize input to prevent XSS attacks
   * SECURITY: Basic input sanitization - should be used with additional validation
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .trim()
      .substring(0, 1000); // Limit length to prevent DoS
  }

  /**
   * Create user response object (excluding sensitive data)
   */
  static createUserResponse(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...userResponse } = user;
    return userResponse;
  }

  /**
   * Check if access token is close to expiration (within 5 minutes)
   * SECURITY: Shorter refresh window for access tokens
   */
  static isAccessTokenNearExpiry(token: string): boolean {
    try {
      const decoded = this.verifyAccessToken(token);
      if (!decoded.exp) return false;
      
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60; // 5 minutes in seconds
      
      return decoded.exp - now < fiveMinutes;
    } catch (error) {
      return true; // If we can't verify, assume it needs refresh
    }
  }

  /**
   * Hash sensitive data for logging (e.g., IP addresses)
   * SECURITY: Hash sensitive information in logs for privacy
   */
  static hashForLogging(data: string): string {
    return crypto.createHash('sha256').update(data + 'salt').digest('hex').substring(0, 12);
  }

  /**
   * Create security context from request
   * SECURITY: Extract security context for logging and validation
   */
  static createSecurityContext(req: any): SecurityContext {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     'unknown';
    
    return {
      ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: Date.now()
    };
  }

  /**
   * Validate Google OAuth token payload
   * SECURITY: Validate Google token structure and required fields
   */
  static validateGoogleTokenPayload(payload: any): boolean {
    return (
      payload &&
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.email_verified === 'boolean' &&
      payload.email_verified === true &&
      typeof payload.name === 'string' &&
      payload.aud && // audience
      payload.iss && // issuer
      payload.exp && // expiration
      payload.iat    // issued at
    );
  }
}

export default AuthUtils;