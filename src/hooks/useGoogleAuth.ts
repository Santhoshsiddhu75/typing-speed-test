import { useCallback } from 'react';
import { authApi } from '@/lib/api';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '1087194439568-iago6f9biafj9f0e0glgo7pfuga0mg0k.apps.googleusercontent.com';

export interface GoogleAuthResponse {
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
}

export const useGoogleAuth = () => {
  const handleGoogleLogin = useCallback(async (credentialResponse: any): Promise<GoogleAuthResponse> => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      // Send the Google ID token to our backend
      const response = await authApi.googleLogin(credentialResponse.credential);
      
      // Save authentication tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      console.log('Google login successful for user:', response.user.username);
      
      return response;
    } catch (error) {
      console.error('Google login failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Google login failed');
    }
  }, []);

  const handleGoogleError = useCallback((error: any) => {
    console.error('Google OAuth error:', error);
    throw new Error('Google authentication failed');
  }, []);

  return {
    clientId: GOOGLE_CLIENT_ID,
    handleGoogleLogin,
    handleGoogleError
  };
};