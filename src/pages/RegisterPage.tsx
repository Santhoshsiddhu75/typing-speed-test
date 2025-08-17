import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import RegisterForm, { RegisterFormData } from '@/components/RegisterForm';
import { authApi } from '@/lib/api';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRegister = async (data: RegisterFormData) => {
    try {
      console.log('Registration attempt:', data.username);
      
      // Call the real registration API
      const response = await authApi.register({
        username: data.username,
        password: data.password
      });

      // Save authentication tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      console.log('Registration successful for user:', response.user.username);
      
      // Navigate to setup page to select timer and difficulty
      navigate('/');
    } catch (error) {
      console.error('Registration failed:', error);
      
      // Extract error message from API response
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const handleTermsClick = () => {
    // TODO: Show terms and conditions modal or navigate to terms page
    console.log('Terms and conditions clicked');
    // You could open a modal, navigate to a terms page, or open in new tab
    // window.open('/terms', '_blank');
  };

  const handleSignInClick = () => {
    navigate('/login');
  };

  return (
    <AuthLayout>
      <RegisterForm
        onSubmit={handleRegister}
        onTermsClick={handleTermsClick}
        onSignInClick={handleSignInClick}
      />
    </AuthLayout>
  );
};

export default RegisterPage;