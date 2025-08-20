import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import LoginForm, { LoginFormData } from '@/components/LoginForm';
import { authApi } from '@/lib/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = async (data: LoginFormData) => {
    try {
      console.log('Login attempt:', data.username, 'Remember me:', data.rememberMe);
      
      // Call the real authentication API
      const response = await authApi.login({
        username: data.username,
        password: data.password
      });

      // Save authentication tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Store remember me preference for longer token expiry
      if (data.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        console.log('Remember me enabled - tokens will persist longer');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
      console.log('Login successful for user:', response.user.username);
      
      // Navigate to setup page to select timer and difficulty
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      
      // Extract error message from API response
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const handleSignUpClick = () => {
    navigate('/register');
  };

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleLogin}
        onSignUpClick={handleSignUpClick}
      />
    </AuthLayout>
  );
};

export default LoginPage;