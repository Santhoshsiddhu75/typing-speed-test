import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import LoginForm, { LoginFormData } from '@/components/LoginForm';
import { authApi } from '@/lib/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = async (data: LoginFormData) => {
    try {
      console.log('Login attempt:', data.username);
      
      // Call the real authentication API
      const response = await authApi.login({
        username: data.username,
        password: data.password
      });

      // Save authentication tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
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

  const handleForgotPassword = () => {
    // TODO: Navigate to forgot password page or show modal
    console.log('Forgot password clicked');
    // navigate('/forgot-password');
  };

  const handleSignUpClick = () => {
    navigate('/register');
  };

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleLogin}
        onForgotPassword={handleForgotPassword}
        onSignUpClick={handleSignUpClick}
      />
    </AuthLayout>
  );
};

export default LoginPage;