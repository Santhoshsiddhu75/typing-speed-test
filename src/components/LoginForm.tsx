import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { authApi } from '@/lib/api';

export interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void> | void;
  onForgotPassword?: () => void;
  onSignUpClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  general?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPassword,
  onSignUpClick,
  isLoading = false,
  className = ''
}) => {
  const navigate = useNavigate();
  
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsSubmitting(true);
        setErrors({});
        
        // Get user info from Google using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        await userInfoResponse.json();
        
        // Create a mock ID token for our backend (you might need to adjust this)
        const response = await authApi.googleLogin(tokenResponse.access_token);
        
        // Save authentication tokens to localStorage
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        console.log('Google login successful for user:', response.user.username);
        navigate('/');
      } catch (error) {
        console.error('Google login failed:', error);
        setErrors({ 
          general: error instanceof Error ? error.message : 'Google sign in failed' 
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: (error) => {
      console.error('Google OAuth error:', error);
      setErrors({ 
        general: 'Google sign in failed' 
      });
    },
  });
  
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Username validation regex (3-20 chars, alphanumeric + underscore)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else {
      const username = formData.username.trim();
      if (!usernameRegex.test(username)) {
        newErrors.username = 'Username must be 3-20 characters (letters, numbers, underscore only)';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear errors when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onSubmit?.(formData);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Login failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const currentIsLoading = isLoading || isSubmitting;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Welcome back to TapTest
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Google Sign In Button */}
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full py-6 text-sm font-medium"
            onClick={() => googleLogin()}
            disabled={isSubmitting || isLoading}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Message */}
          {errors.general && (
            <div 
              className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {errors.general}
            </div>
          )}

          {/* Privacy Notice */}
          {/* <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                <Check className="w-2 h-2 text-white" />
              </div>
              <div className="text-sm">
                <p className="text-green-700 dark:text-green-200">
                  Sign in with your username 
                </p>
              </div>
            </div>
          </div> */}

          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium leading-none">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange('username')}
                className={`pl-10 ${errors.username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={currentIsLoading}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : undefined}
                autoComplete="username"
                data-testid="username-input"
              />
            </div>
            {errors.username && (
              <p 
                id="username-error" 
                className="text-sm text-red-600"
                role="alert"
                aria-live="polite"
              >
                {errors.username}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange('password')}
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={currentIsLoading}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                autoComplete="current-password"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                disabled={currentIsLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="password-toggle"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p 
                id="password-error" 
                className="text-sm text-red-600"
                role="alert"
                aria-live="polite"
              >
                {errors.password}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <Checkbox
              id="remember-me"
              label="Remember me"
              checked={formData.rememberMe}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, rememberMe: checked }))
              }
              disabled={currentIsLoading}
              data-testid="remember-me-checkbox"
            />
            
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
              disabled={currentIsLoading}
              data-testid="forgot-password-link"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={currentIsLoading}
            data-testid="login-button"
          >
            {currentIsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSignUpClick}
              className="text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium transition-colors"
              disabled={currentIsLoading}
              data-testid="sign-up-link"
            >
              Sign up
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;