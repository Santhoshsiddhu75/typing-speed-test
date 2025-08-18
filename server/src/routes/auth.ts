import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import UserService from '../services/userService.js';
import AuthUtils from '../utils/auth.js';
import { 
  authenticateToken, 
  createRateLimit, 
  validateRequest,
  securityHeaders
} from '../middleware/auth.js';
import { 
  RegisterRequestSchema,
  LoginRequestSchema,
  GoogleAuthRequestSchema,
  GoogleUserInfoRequestSchema,
  RefreshTokenRequestSchema,
  ChangePasswordRequestSchema,
  type RegisterRequest,
  type LoginRequest,
  type GoogleAuthRequest,
  type GoogleUserInfoRequest,
  type RefreshTokenRequest,
  type ChangePasswordRequest,
  ApiResponse
} from '../types/index.js';
import { AUTH_RATE_LIMITS } from '../utils/auth.js';

const router = express.Router();

// Security: Apply security headers to all auth routes
router.use(securityHeaders);

// Google OAuth2 Client (configure with your Google credentials)
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

/**
 * POST /api/auth/register
 * SECURITY: Username + password registration with input validation and rate limiting
 */
router.post(
  '/register',
  createRateLimit({
    windowMs: AUTH_RATE_LIMITS.register.windowMs,
    max: AUTH_RATE_LIMITS.register.max,
    message: 'Too many registration attempts. Please try again later.'
  }),
  validateRequest(RegisterRequestSchema),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { username, password }: RegisterRequest = req.body;

      console.log(`🔐 Registration attempt for username: ${username}`);

      // Create user
      const user = await UserService.createUser({
        username,
        password
      });

      // Generate tokens
      const securityContext = AuthUtils.createSecurityContext(req);
      const { accessToken, refreshToken } = AuthUtils.generateTokenPair(user, securityContext);

      // Log successful registration (hash IP for privacy)
      console.log(`✅ User registered successfully: ${username} (IP: ${AuthUtils.hashForLogging(securityContext.ipAddress)})`);

      const response: ApiResponse = {
        success: true,
        message: 'Registration successful',
        data: {
          user: AuthUtils.createUserResponse(user),
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '15m'
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Registration error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      let statusCode = 400;

      // Handle specific error types
      if (errorMessage.includes('already exists')) {
        statusCode = 409;
      } else if (errorMessage.includes('Invalid')) {
        statusCode = 400;
      } else if (errorMessage.includes('Failed to create')) {
        statusCode = 500;
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      };

      res.status(statusCode).json(response);
    }
  }
);

/**
 * POST /api/auth/login
 * SECURITY: Username + password login with rate limiting and secure authentication
 */
router.post(
  '/login',
  createRateLimit({
    windowMs: AUTH_RATE_LIMITS.login.windowMs,
    max: AUTH_RATE_LIMITS.login.max,
    message: 'Too many login attempts. Please try again later.'
  }),
  validateRequest(LoginRequestSchema),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { username, password }: LoginRequest = req.body;
      const securityContext = AuthUtils.createSecurityContext(req);

      console.log(`🔐 Login attempt for username: ${username} (IP: ${AuthUtils.hashForLogging(securityContext.ipAddress)})`);

      // Authenticate user
      const user = await UserService.authenticateUser(username, password);

      if (!user) {
        console.log(`❌ Failed login attempt for username: ${username}`);
        
        const response: ApiResponse = {
          success: false,
          error: 'Invalid username or password',
          code: 'AUTH_INVALID_CREDENTIALS'
        };

        res.status(401).json(response);
        return;
      }

      // Generate tokens
      const { accessToken, refreshToken } = AuthUtils.generateTokenPair(user, securityContext);

      console.log(`✅ User logged in successfully: ${username}`);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: AuthUtils.createUserResponse(user),
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '15m'
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Login error:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/auth/google
 * SECURITY: Google OAuth integration with token validation
 */
router.post(
  '/google',
  createRateLimit({
    windowMs: AUTH_RATE_LIMITS.login.windowMs,
    max: AUTH_RATE_LIMITS.login.max,
    message: 'Too many Google OAuth attempts. Please try again later.'
  }),
  validateRequest(GoogleAuthRequestSchema),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { idToken }: GoogleAuthRequest = req.body;
      const securityContext = AuthUtils.createSecurityContext(req);

      console.log(`🔐 Google OAuth attempt from IP: ${AuthUtils.hashForLogging(securityContext.ipAddress)}`);

      if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('❌ Google OAuth not configured: GOOGLE_CLIENT_ID missing');
        
        const response: ApiResponse = {
          success: false,
          error: 'Google OAuth not configured',
          code: 'OAUTH_NOT_CONFIGURED'
        };

        res.status(503).json(response);
        return;
      }

      // Verify Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      if (!payload || !AuthUtils.validateGoogleTokenPayload(payload)) {
        console.log('❌ Invalid Google token payload');
        
        const response: ApiResponse = {
          success: false,
          error: 'Invalid Google token',
          code: 'OAUTH_INVALID_TOKEN'
        };

        res.status(400).json(response);
        return;
      }

      // Find or create user
      console.log(`🔍 Google OAuth payload picture: ${payload.picture}`);
      const user = await UserService.findOrCreateGoogleUser({
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture
      });

      console.log(`🔍 User returned from findOrCreateGoogleUser:`, { 
        id: user.id, 
        username: user.username, 
        profile_picture: user.profile_picture 
      });

      // Generate tokens
      const { accessToken, refreshToken } = AuthUtils.generateTokenPair(user, securityContext);

      const userResponse = AuthUtils.createUserResponse(user);
      console.log(`🔍 User response after createUserResponse:`, { 
        id: userResponse.id, 
        username: userResponse.username, 
        profile_picture: userResponse.profile_picture 
      });

      console.log(`✅ Google OAuth successful for user: ${user.username}`);

      const response: ApiResponse = {
        success: true,
        message: 'Google authentication successful',
        data: {
          user: userResponse,
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '15m'
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Google OAuth error:', error);

      let errorMessage = 'Google authentication failed';
      let statusCode = 500;

      if (error instanceof Error) {
        if (error.message.includes('Token used too late') || error.message.includes('Invalid token signature')) {
          errorMessage = 'Invalid or expired Google token';
          statusCode = 400;
        } else if (error.message.includes('Invalid value')) {
          errorMessage = 'Invalid Google token';
          statusCode = 400;
        }
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        code: 'OAUTH_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      };

      res.status(statusCode).json(response);
    }
  }
);

/**
 * POST /api/auth/google-userinfo
 * SECURITY: Google OAuth integration using user info from access token
 */
router.post(
  '/google-userinfo',
  createRateLimit({
    windowMs: AUTH_RATE_LIMITS.login.windowMs,
    max: AUTH_RATE_LIMITS.login.max,
    message: 'Too many Google OAuth attempts. Please try again later.'
  }),
  validateRequest(GoogleUserInfoRequestSchema),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { id, email, name, picture }: GoogleUserInfoRequest = req.body;
      const securityContext = AuthUtils.createSecurityContext(req);

      console.log(`🔐 Google OAuth userinfo attempt from IP: ${AuthUtils.hashForLogging(securityContext.ipAddress)}`);

      // Find or create user using the user info
      console.log(`🔍 Google OAuth userinfo picture: ${picture}`);
      const user = await UserService.findOrCreateGoogleUser({
        googleId: id,
        email: email,
        name: name,
        picture: picture
      });

      console.log(`🔍 User returned from findOrCreateGoogleUser:`, { 
        id: user.id, 
        username: user.username, 
        profile_picture: user.profile_picture 
      });

      // Generate tokens
      const { accessToken, refreshToken } = AuthUtils.generateTokenPair(user, securityContext);

      const userResponse = AuthUtils.createUserResponse(user);
      console.log(`🔍 User response after createUserResponse:`, { 
        id: userResponse.id, 
        username: userResponse.username, 
        profile_picture: userResponse.profile_picture 
      });

      console.log(`✅ Google OAuth userinfo successful for user: ${user.username}`);

      const response: ApiResponse = {
        success: true,
        message: 'Google authentication successful',
        data: {
          user: userResponse,
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '15m'
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Google OAuth userinfo error:', error);

      let errorMessage = 'Google authentication failed';
      let statusCode = 500;

      if (error instanceof Error) {
        if (error.message.includes('Invalid')) {
          errorMessage = 'Invalid user information';
          statusCode = 400;
        }
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        code: 'OAUTH_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      };

      res.status(statusCode).json(response);
    }
  }
);

/**
 * POST /api/auth/refresh
 * SECURITY: Refresh access tokens with secure token rotation
 */
router.post(
  '/refresh',
  createRateLimit({
    windowMs: AUTH_RATE_LIMITS.refresh.windowMs,
    max: AUTH_RATE_LIMITS.refresh.max,
    message: 'Too many token refresh attempts. Please try again later.'
  }),
  validateRequest(RefreshTokenRequestSchema),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      const securityContext = AuthUtils.createSecurityContext(req);

      console.log(`🔄 Token refresh attempt from IP: ${AuthUtils.hashForLogging(securityContext.ipAddress)}`);

      // Verify refresh token
      const decoded = AuthUtils.verifyRefreshToken(refreshToken);

      // Fetch current user
      const user = await UserService.findUserById(decoded.userId);
      if (!user) {
        console.log('❌ Refresh token user not found');
        
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
          code: 'AUTH_USER_NOT_FOUND'
        };

        res.status(401).json(response);
        return;
      }

      // Generate new token pair (token rotation for security)
      const { accessToken, refreshToken: newRefreshToken } = AuthUtils.generateTokenPair(user, securityContext);

      console.log(`✅ Token refreshed for user: ${user.username}`);

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: '15m'
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Token refresh error:', error);

      let errorMessage = 'Token refresh failed';
      let code = 'AUTH_REFRESH_FAILED';

      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorMessage = 'Refresh token has expired';
          code = 'AUTH_TOKEN_EXPIRED';
        } else if (error.message.includes('Invalid')) {
          errorMessage = 'Invalid refresh token';
          code = 'AUTH_TOKEN_INVALID';
        }
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        code,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      };

      res.status(401).json(response);
    }
  }
);

/**
 * GET /api/auth/me
 * SECURITY: Get current authenticated user information
 */
router.get(
  '/me',
  authenticateToken,
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
          code: 'AUTH_NOT_AUTHENTICATED'
        };

        res.status(401).json(response);
        return;
      }

      // Get user statistics
      const stats = await UserService.getUserStats(req.user.id);

      console.log(`🔍 /me endpoint - req.user:`, { 
        id: req.user.id, 
        username: req.user.username, 
        profile_picture: req.user.profile_picture 
      });

      const userResponse = AuthUtils.createUserResponse(req.user);
      console.log(`🔍 /me endpoint - user response:`, { 
        id: userResponse.id, 
        username: userResponse.username, 
        profile_picture: userResponse.profile_picture 
      });

      const response: ApiResponse = {
        success: true,
        data: {
          user: userResponse,
          stats
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Get user info error:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to get user information',
        code: 'USER_INFO_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/auth/logout
 * SECURITY: Logout user (client-side token invalidation)
 */
router.post(
  '/logout',
  authenticateToken,
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      // For enhanced security, you could implement server-side token blacklisting here
      // using the JWT ID (jti) claim and a blacklist store (Redis, database, etc.)
      
      console.log(`✅ User logged out: ${req.user?.username || 'unknown'}`);

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Logout error:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/auth/change-password
 * SECURITY: Change user password with current password verification
 */
router.post(
  '/change-password',
  authenticateToken,
  createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per 15 minutes
    message: 'Too many password change attempts. Please try again later.'
  }),
  validateRequest(ChangePasswordRequestSchema),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        };

        res.status(401).json(response);
        return;
      }

      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

      console.log(`🔒 Password change attempt for user: ${req.user.username}`);

      // Change password
      await UserService.changePassword(req.user.id, currentPassword, newPassword);

      console.log(`✅ Password changed successfully for user: ${req.user.username}`);

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Password change error:', error);

      let errorMessage = 'Password change failed';
      let statusCode = 500;

      if (error instanceof Error) {
        if (error.message.includes('incorrect')) {
          errorMessage = 'Current password is incorrect';
          statusCode = 400;
        } else if (error.message.includes('Invalid new password')) {
          errorMessage = error.message;
          statusCode = 400;
        }
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        code: 'PASSWORD_CHANGE_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      };

      res.status(statusCode).json(response);
    }
  }
);

export default router;