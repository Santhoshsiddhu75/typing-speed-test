import express from 'express';
import { z } from 'zod';
import UserService from '../services/userService.js';
import { authenticateToken } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';
import { upload, uploadProfilePicture } from '../services/cloudinaryService.js';

const router = express.Router();

// Update profile schema
const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  profile_picture: z.string().url().optional(),
  default_timer: z.enum(['1', '2', '5']).optional(),
  default_difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
}).strict();

// Change password schema
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
}).strict();

/**
 * PATCH /api/users/:id
 * Update user profile information
 */
router.patch('/users/:id', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      } satisfies ApiResponse);
      return;
    }

    // Check if user is updating their own profile
    if (req.user.id !== userId) {
      res.status(403).json({
        success: false,
        error: 'You can only update your own profile',
        code: 'FORBIDDEN'
      } satisfies ApiResponse);
      return;
    }

    // Validate request body
    const validationResult = UpdateProfileSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      } satisfies ApiResponse);
      return;
    }

    const updateData = validationResult.data;

    // Update user profile
    const updatedUser = await UserService.updateUserProfile(userId, updateData);

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          profile_picture: updatedUser.profile_picture,
          default_timer: updatedUser.default_timer,
          default_difficulty: updatedUser.default_difficulty,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }
      },
      message: 'Profile updated successfully'
    } satisfies ApiResponse);

  } catch (error) {
    console.error('❌ Profile update error:', error);

    let errorMessage = 'Profile update failed';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Username already exists')) {
        errorMessage = 'Username is already taken';
        statusCode = 409;
      } else if (error.message.includes('User not found')) {
        errorMessage = 'User not found';
        statusCode = 404;
      } else if (error.message.includes('Invalid')) {
        errorMessage = error.message;
        statusCode = 400;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: 'PROFILE_UPDATE_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined 
      })
    } satisfies ApiResponse);
  }
});

/**
 * POST /api/users/:id/password
 * Change user password (non-OAuth users only)
 */
router.post('/users/:id/password', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      } satisfies ApiResponse);
      return;
    }

    // Check if user is updating their own password
    if (req.user.id !== userId) {
      res.status(403).json({
        success: false,
        error: 'You can only change your own password',
        code: 'FORBIDDEN'
      } satisfies ApiResponse);
      return;
    }

    // Check if user is Google OAuth user (cannot change password)
    if (req.user.google_id) {
      res.status(400).json({
        success: false,
        error: 'Cannot change password for Google OAuth accounts',
        code: 'OAUTH_PASSWORD_CHANGE_NOT_ALLOWED'
      } satisfies ApiResponse);
      return;
    }

    // Validate request body
    const validationResult = ChangePasswordSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      } satisfies ApiResponse);
      return;
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Change password
    await UserService.changePassword(userId, currentPassword, newPassword);

    console.log(`✅ Password changed successfully for user: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    } satisfies ApiResponse);

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
      } else if (error.message.includes('User not found')) {
        errorMessage = 'User not found';
        statusCode = 404;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: 'PASSWORD_CHANGE_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined 
      })
    } satisfies ApiResponse);
  }
});

/**
 * POST /api/users/:id/avatar
 * Upload profile picture
 */
router.post('/users/:id/avatar', authenticateToken, upload.single('avatar'), async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      } satisfies ApiResponse);
      return;
    }

    // Check if user is uploading their own avatar
    if (req.user.id !== userId) {
      res.status(403).json({
        success: false,
        error: 'You can only upload your own profile picture',
        code: 'FORBIDDEN'
      } satisfies ApiResponse);
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
        code: 'NO_FILE'
      } satisfies ApiResponse);
      return;
    }

    console.log(`📸 Uploading avatar for user ${userId}:`, {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Get current profile picture URL to delete old one
    const currentUser = await UserService.getUserById(userId);
    const oldImageUrl = currentUser?.profile_picture;

    // Upload to Cloudinary
    const imageUrl = await uploadProfilePicture(
      req.file.buffer,
      userId,
      oldImageUrl || undefined
    );

    // Update user profile with new image URL
    const updatedUser = await UserService.updateUserProfile(userId, {
      profile_picture: imageUrl
    });

    console.log(`✅ Avatar uploaded successfully for user ${userId}: ${imageUrl}`);

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          profile_picture: updatedUser.profile_picture,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        },
        imageUrl
      },
      message: 'Profile picture uploaded successfully'
    } satisfies ApiResponse);

  } catch (error) {
    console.error('❌ Avatar upload error:', error);

    let errorMessage = 'Failed to upload profile picture';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Invalid file type')) {
        errorMessage = 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.';
        statusCode = 400;
      } else if (error.message.includes('File too large')) {
        errorMessage = 'File too large. Maximum size is 5MB.';
        statusCode = 400;
      } else if (error.message.includes('User not found')) {
        errorMessage = 'User not found';
        statusCode = 404;
      } else if (error.message.includes('upload')) {
        errorMessage = 'Image upload failed. Please try again.';
        statusCode = 500;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: 'AVATAR_UPLOAD_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined 
      })
    } satisfies ApiResponse);
  }
});

/**
 * DELETE /api/users/:id/avatar
 * Delete profile picture
 */
router.delete('/users/:id/avatar', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      } satisfies ApiResponse);
      return;
    }

    // Check if user is deleting their own avatar
    if (req.user.id !== userId) {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own profile picture',
        code: 'FORBIDDEN'
      } satisfies ApiResponse);
      return;
    }

    // Get current profile picture URL
    const currentUser = await UserService.getUserById(userId);
    const imageUrl = currentUser?.profile_picture;

    if (!imageUrl) {
      res.status(400).json({
        success: false,
        error: 'No profile picture to delete',
        code: 'NO_PROFILE_PICTURE'
      } satisfies ApiResponse);
      return;
    }

    // Delete from Cloudinary and update database
    const updatedUser = await UserService.updateUserProfile(userId, {
      profile_picture: null
    });

    console.log(`✅ Avatar deleted successfully for user ${userId}`);

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          profile_picture: updatedUser.profile_picture,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }
      },
      message: 'Profile picture deleted successfully'
    } satisfies ApiResponse);

  } catch (error) {
    console.error('❌ Avatar delete error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to delete profile picture',
      code: 'AVATAR_DELETE_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined 
      })
    } satisfies ApiResponse);
  }
});

export default router;