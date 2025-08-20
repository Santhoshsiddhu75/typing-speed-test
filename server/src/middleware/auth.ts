import { Request, Response, NextFunction } from 'express';
import AuthUtils, { JWTPayload } from '../utils/auth.js';
import UserService from '../services/userService.js';
import { User } from '../types/index.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      securityContext?: {
        ipAddress: string;
        userAgent: string;
        timestamp: number;
      };
    }
  }
}

/**
 * Authentication Middleware
 * SECURITY: Validates JWT tokens and populates request with user data
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
      return;
    }

    // Verify access token
    let decoded: JWTPayload;
    try {
      decoded = AuthUtils.verifyAccessToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid token';
      
      // Different error codes for different token issues
      let code = 'AUTH_TOKEN_INVALID';
      if (errorMessage.includes('expired')) {
        code = 'AUTH_TOKEN_EXPIRED';
      }

      res.status(401).json({
        success: false,
        error: errorMessage,
        code
      });
      return;
    }

    // Fetch current user data from database
    const user = await UserService.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'AUTH_USER_NOT_FOUND'
      });
      return;
    }

    // Add user and security context to request
    req.user = user;
    req.securityContext = AuthUtils.createSecurityContext(req);

    // Update user's last activity (non-blocking)
    UserService.updateLastLogin(user.id).catch(err => 
      console.error('Failed to update last login:', err)
    );

    next();

  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal authentication error',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
};

/**
 * Optional Authentication Middleware
 * SECURITY: Adds user data to request if token is provided and valid, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided - continue without authentication
      req.securityContext = AuthUtils.createSecurityContext(req);
      next();
      return;
    }

    try {
      const decoded = AuthUtils.verifyAccessToken(token);
      const user = await UserService.findUserById(decoded.userId);
      
      if (user) {
        req.user = user;
        // Update user's last activity (non-blocking)
        UserService.updateLastLogin(user.id).catch(err => 
          console.error('Failed to update last login:', err)
        );
      }
    } catch (error) {
      // Token is invalid but we don't fail the request
      console.warn('Invalid optional auth token:', error instanceof Error ? error.message : 'Unknown error');
    }

    req.securityContext = AuthUtils.createSecurityContext(req);
    next();

  } catch (error) {
    console.error('❌ Optional authentication middleware error:', error);
    req.securityContext = AuthUtils.createSecurityContext(req);
    next();
  }
};

/**
 * Admin Authentication Middleware
 * SECURITY: Requires authentication and admin privileges
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // First ensure user is authenticated
  await authenticateToken(req, res, () => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Check if user is admin (implement your admin logic here)
    // For now, we'll use a simple username check - replace with proper role system
    const adminUsernames = ['admin', 'administrator'];
    
    if (!adminUsernames.includes(req.user.username.toLowerCase())) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        code: 'AUTH_INSUFFICIENT_PRIVILEGES'
      });
      return;
    }

    next();
  });
};

/**
 * Rate Limiting Middleware Factory
 * SECURITY: Implements rate limiting to prevent abuse
 */
interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

// Simple in-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const createRateLimit = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }

    let record = rateLimitStore.get(key);
    
    if (!record) {
      record = { count: 0, resetTime: now + options.windowMs };
      rateLimitStore.set(key, record);
    }

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + options.windowMs;
    }

    record.count++;

    if (record.count > options.max) {
      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': options.max.toString(),
      'X-RateLimit-Remaining': Math.max(0, options.max - record.count).toString(),
      'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString()
    });

    next();
  };
};

/**
 * Request Validation Middleware Factory
 * SECURITY: Validates request body against Zod schemas
 */
export const validateRequest = <T>(schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and sanitize request body
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error: any) {
      if (error.errors) {
        const validationErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR'
        });
      }
    }
  };
};

/**
 * Security Headers Middleware
 * SECURITY: Adds security headers following OWASP guidelines
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // OWASP recommended security headers
  res.set({
    // Prevent XSS attacks
    'X-XSS-Protection': '1; mode=block',
    
    // Prevent content type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent framing (clickjacking)
    'X-Frame-Options': 'DENY',
    
    // Force HTTPS (uncomment in production with HTTPS)
    // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Content Security Policy (adjust based on your needs)
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; frame-src https://accounts.google.com; frame-ancestors 'none'",
    
    // Feature Policy (now Permissions Policy)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Cross-Origin-Opener-Policy to allow Google OAuth popups
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    
    // Cross-Origin-Embedder-Policy for security
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    
    // Remove server information
    'Server': ''
  });

  next();
};

/**
 * CORS Configuration for Authentication
 * SECURITY: Restrictive CORS policy for auth endpoints
 */
export const authCorsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://santhoshsiddhu75.github.io',
    'https://typing-speed-test-ten-delta.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-CSRF-Token'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
};