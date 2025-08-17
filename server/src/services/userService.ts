import { database } from '../db/database.js';
import { User } from '../types/index.js';
import AuthUtils from '../utils/auth.js';

export interface CreateUserRequest {
  username: string;
  password: string;
  googleId?: string;
  email?: string;
}

export interface GoogleUserData {
  googleId: string;
  email: string;
  name: string;
  username?: string;
}

/**
 * User Service - Secure database operations for user management
 * SECURITY: Implements defense in depth with input validation, SQL injection prevention,
 * and secure data handling following OWASP guidelines
 */
export class UserService {
  
  /**
   * Create a new user with username and password
   * SECURITY: Validates input, checks for existing users, hashes password
   */
  static async createUser(userData: CreateUserRequest): Promise<User> {
    const { username, password, googleId } = userData;

    // Input validation and sanitization
    const sanitizedUsername = AuthUtils.sanitizeInput(username);
    
    // Validate username format
    const usernameValidation = AuthUtils.validateUsername(sanitizedUsername);
    if (!usernameValidation.valid) {
      throw new Error(`Invalid username: ${usernameValidation.errors.join(', ')}`);
    }

    // Validate password strength (only for non-Google users)
    if (!googleId) {
      if (!password) {
        throw new Error('Password is required for username registration');
      }
      
      const passwordValidation = AuthUtils.validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
      }
    }

    try {
      // Check if username already exists
      // SECURITY: Use parameterized queries to prevent SQL injection
      const existingUser = await database.get<User>(
        'SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)',
        [sanitizedUsername]
      );

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Check if Google ID already exists (for Google OAuth users)
      if (googleId) {
        const existingGoogleUser = await database.get<User>(
          'SELECT id, username FROM users WHERE google_id = ?',
          [googleId]
        );

        if (existingGoogleUser) {
          throw new Error('Google account already registered');
        }
      }

      // Hash password if provided
      let passwordHash: string | null = null;
      if (password) {
        passwordHash = await AuthUtils.hashPassword(password);
      }

      // Insert new user
      const result = await database.run(`
        INSERT INTO users (username, password_hash, google_id, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [sanitizedUsername, passwordHash, googleId || null]);

      if (!result.lastID) {
        throw new Error('Failed to create user');
      }

      // Fetch and return the created user (without password hash)
      const newUser = await database.get<User>(
        'SELECT id, username, google_id, created_at, updated_at FROM users WHERE id = ?',
        [result.lastID]
      );

      if (!newUser) {
        throw new Error('Failed to retrieve created user');
      }

      console.log(`✅ User created successfully: ${sanitizedUsername} (ID: ${result.lastID})`);
      return newUser;

    } catch (error) {
      console.error('❌ Error creating user:', error);
      
      // Don't leak internal error details to prevent information disclosure
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('Invalid')) {
          throw error;
        }
      }
      
      throw new Error('Failed to create user account');
    }
  }

  /**
   * Authenticate user with username and password
   * SECURITY: Secure password verification with timing attack protection
   */
  static async authenticateUser(username: string, password: string): Promise<User | null> {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const sanitizedUsername = AuthUtils.sanitizeInput(username);

    try {
      // Get user with password hash
      const user = await database.get<User & { password_hash: string }>(
        'SELECT id, username, password_hash, google_id, created_at, updated_at FROM users WHERE LOWER(username) = LOWER(?)',
        [sanitizedUsername]
      );

      if (!user) {
        // SECURITY: Perform dummy hash to prevent timing attacks
        await AuthUtils.hashPassword('dummy-password');
        return null;
      }

      if (!user.password_hash) {
        // Account exists but no password set (Google OAuth only)
        return null;
      }

      // Verify password
      const isValid = await AuthUtils.comparePassword(password, user.password_hash);
      
      if (!isValid) {
        return null;
      }

      // Return user without password hash
      const { password_hash, ...authenticatedUser } = user;
      
      console.log(`✅ User authenticated successfully: ${sanitizedUsername}`);
      return authenticatedUser;

    } catch (error) {
      console.error('❌ Error authenticating user:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Find user by username
   * SECURITY: Returns user data without sensitive information
   */
  static async findUserByUsername(username: string): Promise<User | null> {
    if (!username) {
      return null;
    }

    const sanitizedUsername = AuthUtils.sanitizeInput(username);

    try {
      const user = await database.get<User>(
        'SELECT id, username, google_id, created_at, updated_at FROM users WHERE LOWER(username) = LOWER(?)',
        [sanitizedUsername]
      );

      return user || null;
    } catch (error) {
      console.error('❌ Error finding user by username:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Find user by ID
   * SECURITY: Returns user data without sensitive information
   */
  static async findUserById(userId: number): Promise<User | null> {
    if (!userId || userId <= 0) {
      return null;
    }

    try {
      const user = await database.get<User>(
        'SELECT id, username, google_id, profile_picture, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      return user || null;
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Get user by ID (alias for findUserById for consistency)
   * SECURITY: Returns user data without sensitive information
   */
  static async getUserById(userId: number): Promise<User | null> {
    return this.findUserById(userId);
  }

  /**
   * Find or create user for Google OAuth
   * SECURITY: Validates Google user data and handles account linking
   */
  static async findOrCreateGoogleUser(googleUserData: GoogleUserData): Promise<User> {
    const { googleId, email, name } = googleUserData;

    if (!googleId || !email || !name) {
      throw new Error('Invalid Google user data');
    }

    try {
      // First, try to find existing user by Google ID
      let user = await database.get<User>(
        'SELECT id, username, google_id, created_at, updated_at FROM users WHERE google_id = ?',
        [googleId]
      );

      if (user) {
        console.log(`✅ Existing Google user found: ${user.username}`);
        return user;
      }

      // If not found, create a new user
      // Generate username from email (fallback to name)
      let baseUsername = googleUserData.username || 
                        email.split('@')[0] || 
                        name.replace(/\s+/g, '').toLowerCase();
      
      // Sanitize and validate username
      baseUsername = AuthUtils.sanitizeInput(baseUsername);
      
      // Ensure username is unique
      let username = baseUsername;
      let counter = 1;
      
      while (true) {
        const existingUser = await database.get<User>(
          'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
          [username]
        );
        
        if (!existingUser) {
          break;
        }
        
        username = `${baseUsername}${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 1000) {
          throw new Error('Unable to generate unique username');
        }
      }

      // Create new Google user
      const result = await database.run(`
        INSERT INTO users (username, google_id, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [username, googleId]);

      if (!result.lastID) {
        throw new Error('Failed to create Google user');
      }

      // Fetch and return the created user
      const newUser = await database.get<User>(
        'SELECT id, username, google_id, created_at, updated_at FROM users WHERE id = ?',
        [result.lastID]
      );

      if (!newUser) {
        throw new Error('Failed to retrieve created Google user');
      }

      console.log(`✅ New Google user created: ${username} (ID: ${result.lastID})`);
      return newUser;

    } catch (error) {
      console.error('❌ Error finding/creating Google user:', error);
      throw new Error('Failed to process Google authentication');
    }
  }

  /**
   * Update user's last login timestamp
   * SECURITY: Track user activity for security monitoring
   */
  static async updateLastLogin(userId: number): Promise<void> {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    try {
      await database.run(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('❌ Error updating last login:', error);
      // Don't throw error for non-critical operation
    }
  }

  /**
   * Change user password
   * SECURITY: Validates new password strength and updates hash
   */
  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    if (!userId || !currentPassword || !newPassword) {
      throw new Error('User ID, current password, and new password are required');
    }

    // Validate new password strength
    const passwordValidation = AuthUtils.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Invalid new password: ${passwordValidation.errors.join(', ')}`);
    }

    try {
      // Get current user with password hash
      const user = await database.get<User & { password_hash: string }>(
        'SELECT id, username, password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (!user || !user.password_hash) {
        throw new Error('User not found or password not set');
      }

      // Verify current password
      const isCurrentValid = await AuthUtils.comparePassword(currentPassword, user.password_hash);
      if (!isCurrentValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await AuthUtils.hashPassword(newPassword);

      // Update password hash
      const result = await database.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, userId]
      );

      if (result.changes === 0) {
        throw new Error('Failed to update password');
      }

      console.log(`✅ Password changed for user ID: ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error changing password:', error);
      throw error;
    }
  }

  /**
   * Get user statistics (for dashboard)
   * SECURITY: Only returns non-sensitive user statistics
   */
  static async getUserStats(userId: number): Promise<any> {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_tests,
          COALESCE(AVG(wpm), 0) as average_wpm,
          COALESCE(AVG(accuracy), 0) as average_accuracy,
          COALESCE(MAX(wpm), 0) as best_wpm,
          COALESCE(MAX(accuracy), 0) as best_accuracy,
          COALESCE(SUM(total_time), 0) as total_time_spent
        FROM test_results 
        WHERE username = (SELECT username FROM users WHERE id = ?)
      `, [userId]);

      return stats || {
        total_tests: 0,
        average_wpm: 0,
        average_accuracy: 0,
        best_wpm: 0,
        best_accuracy: 0,
        total_time_spent: 0
      };

    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw new Error('Failed to retrieve user statistics');
    }
  }

  /**
   * Update user profile information
   * SECURITY: Validates input and prevents username conflicts
   */
  static async updateUserProfile(userId: number, updateData: {
    username?: string;
    profile_picture?: string | null;
  }): Promise<User> {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    try {
      // Check if user exists
      const existingUser = await this.findUserById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // If username is being updated, check for uniqueness
      if (updateData.username && updateData.username !== existingUser.username) {
        const existingUsername = await database.get<{ id: number }>(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [updateData.username, userId]
        );

        if (existingUsername) {
          throw new Error('Username already exists');
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updateData.username) {
        updateFields.push('username = ?');
        updateValues.push(updateData.username);
      }

      if (updateData.profile_picture !== undefined) {
        updateFields.push('profile_picture = ?');
        updateValues.push(updateData.profile_picture);
      }


      if (updateFields.length === 0) {
        // No updates requested, return existing user
        return existingUser;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(userId);

      const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      
      const result = await database.run(updateQuery, updateValues);

      if (result.changes === 0) {
        throw new Error('Failed to update user profile');
      }

      // Return updated user
      const updatedUser = await database.get<User>(
        'SELECT id, username, google_id, profile_picture, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      console.log(`✅ Profile updated for user ID: ${userId}`);
      return updatedUser;

    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }
}

export default UserService;