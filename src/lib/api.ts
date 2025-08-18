// API client for test results
import { TestResult } from '@/types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-domain.com/api' // Update this for production
  : 'http://localhost:3003/api';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
}

interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Test Result Types for API
export interface CreateTestResultRequest {
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
}

export interface GetTestResultsRequest {
  username: string;
  limit?: number;
  offset?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  start_date?: string;
  end_date?: string;
}

// Generic API request function with automatic token refresh
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // Handle token expiration with automatic refresh
    if (response.status === 401 && retryCount === 0) {
      const headers = config.headers as Record<string, string> | undefined;
      const authHeader = headers?.['Authorization'];
      
      // Only try to refresh if this was an authenticated request
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          console.log('Access token expired, attempting refresh...');
          const newTokens = await authApi.refreshToken();
          
          // Update stored tokens
          localStorage.setItem('accessToken', newTokens.accessToken);
          localStorage.setItem('refreshToken', newTokens.refreshToken);
          
          // Retry the original request with new token
          const newConfig = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${newTokens.accessToken}`
            }
          };
          
          console.log('Token refreshed, retrying request...');
          return apiRequest<T>(endpoint, { ...options, headers: newConfig.headers }, retryCount + 1);
          
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Clear tokens and let the error fall through to trigger logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          throw new Error('Session expired. Please log in again.');
        }
      }
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data.data;
  } catch (error) {
    console.error('API Request failed:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Network error or API unavailable');
  }
}

// Test Results API Functions
export const testResultsApi = {
  /**
   * Save a new test result
   */
  async createTestResult(testData: CreateTestResultRequest): Promise<TestResult> {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    return apiRequest<TestResult>('/tests', {
      method: 'POST',
      headers,
      body: JSON.stringify(testData),
    });
  },

  /**
   * Get test results for a user
   */
  async getTestResults(params: GetTestResultsRequest): Promise<PaginatedResponse<TestResult>> {
    const searchParams = new URLSearchParams();
    
    // Add required username
    searchParams.append('username', params.username);
    
    // Add optional parameters
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);

    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

    return apiRequest<PaginatedResponse<TestResult>>(`/tests?${searchParams.toString()}`, {
      headers
    });
  },

  /**
   * Get user statistics (for future use)
   */
  async getUserStats(username: string) {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    return apiRequest(`/tests/stats/${username}`, {
      headers
    });
  },

  /**
   * Get leaderboard (for future use)
   */
  async getLeaderboard(difficulty?: string, limit = 10) {
    const searchParams = new URLSearchParams();
    if (difficulty) searchParams.append('difficulty', difficulty);
    searchParams.append('limit', limit.toString());

    return apiRequest(`/tests/leaderboard?${searchParams.toString()}`);
  }
};

// Health check function
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Authentication API types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    created_at: string;
    updated_at: string;
    google_id?: string;
    profile_picture?: string;
  };
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface UserInfo {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
  google_id?: string;
  profile_picture?: string;
  stats?: {
    total_tests: number;
    average_wpm: number;
    average_accuracy: number;
    best_wpm: number;
    best_accuracy: number;
    total_time_spent: number;
  };
}

// Authentication API functions
export const authApi = {
  // Login with username and password
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Get current user info (requires authentication)
  async getCurrentUser(): Promise<UserInfo> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiRequest<{user: UserInfo, stats: any}>('/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Extract user from the response data structure
    return response.user;
  },

  // Refresh access token
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    return apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  },

  // Google OAuth login
  async googleLogin(googleIdToken: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: googleIdToken })
    });
  },
  
  // Google OAuth login with user info
  async googleLoginWithUserInfo(userInfo: { id: string; email: string; name: string; picture: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/google-userinfo', {
      method: 'POST',
      body: JSON.stringify(userInfo)
    });
  },

  // Logout (clear local tokens)
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

// Helper function to save test result from typing test
export async function saveTypingTestResult(
  testResult: TestResult,
  username: string
): Promise<void> {
  if (!username) {
    throw new Error('Username is required to save test results');
  }

  const testData: CreateTestResultRequest = {
    username,
    wpm: testResult.wpm,
    cpm: testResult.cpm,
    accuracy: testResult.accuracy,
    total_time: testResult.totalTime,
    difficulty: testResult.difficulty,
    total_characters: testResult.totalChars || 0,
    correct_characters: testResult.correctChars || 0,
    incorrect_characters: testResult.incorrectChars || 0,
    test_text: undefined // We can add this later if needed
  };

  await testResultsApi.createTestResult(testData);
}

// User management API
export const userApi = {
  // Update user profile
  async updateProfile(userId: number, data: {
    username?: string;
    profile_picture?: string;
  }) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiRequest(`/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  // Change password
  async changePassword(userId: number, data: {
    currentPassword: string;
    newPassword: string;
  }) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiRequest(`/users/${userId}/password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  // Delete all test history
  async deleteAllTestHistory(username: string) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiRequest(`/tests?username=${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Export test history (returns CSV download URL)
  exportTestHistory(username: string): string {
    return `${API_BASE_URL}/tests/export?username=${encodeURIComponent(username)}`;
  },

  // Upload avatar
  async uploadAvatar(userId: number, file: File) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    // Use a custom version of apiRequest for FormData (can't use JSON headers)
    const url = `${API_BASE_URL}/users/${userId}/avatar`;
    
    const config: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    };

    const response = await fetch(url, config);
    
    // Handle token expiration with automatic refresh
    if (response.status === 401) {
      try {
        console.log('Access token expired, attempting refresh...');
        const newTokens = await authApi.refreshToken();
        
        // Update stored tokens
        localStorage.setItem('accessToken', newTokens.accessToken);
        localStorage.setItem('refreshToken', newTokens.refreshToken);
        
        // Retry the request with new token
        const retryConfig = {
          ...config,
          headers: {
            'Authorization': `Bearer ${newTokens.accessToken}`
          }
        };
        
        console.log('Token refreshed, retrying avatar upload...');
        const retryResponse = await fetch(url, retryConfig);
        
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json();
          throw new Error(errorData.error || 'Avatar upload failed');
        }
        
        return retryResponse.json();
        
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Avatar upload failed');
    }
    
    return response.json();
  }
};

export default testResultsApi;