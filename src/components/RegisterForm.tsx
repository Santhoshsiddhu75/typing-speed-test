import React, { useState, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Loader2, Check, X, User, Info } from 'lucide-react';
import { authApi } from '@/lib/api';

export interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => Promise<void> | void;
  onTermsClick?: () => void;
  onSignInClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  general?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  criteria: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
  };
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onTermsClick,
  onSignInClick,
  isLoading = false,
  className = ''
}) => {
  const navigate = useNavigate();
  
  const googleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsSubmitting(true);
        setErrors({});
        
        console.log('Google signup success, getting user info...');
        
        // Get user info from Google using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user info from Google');
        }
        
        const userInfo = await userInfoResponse.json();
        console.log('Google user info:', userInfo);
        
        // Send user info to our backend
        const response = await authApi.googleLoginWithUserInfo({
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        });
        
        // Debug: Log the full response from server
        console.log('🔍 Google signup response:', response);
        console.log('🔍 Google signup response.user:', response.user);
        console.log('🔍 Google signup response.user.profile_picture:', response.user.profile_picture);
        
        // Save authentication tokens to localStorage
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        console.log('Google signup successful for user:', response.user.username);
        navigate('/');
      } catch (error) {
        console.error('Google signup failed:', error);
        setErrors({ 
          general: error instanceof Error ? error.message : 'Google sign up failed' 
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: () => {
      console.error('Google OAuth error');
      setErrors({ 
        general: 'Google sign up failed' 
      });
    }
  });
  
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUsernameInfo, setShowUsernameInfo] = useState(false);

  // Close username info tooltip when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showUsernameInfo) {
        setShowUsernameInfo(false);
      }
    };

    if (showUsernameInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUsernameInfo]);

  // Username validation regex (3-20 chars, alphanumeric + underscore)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  // Password strength calculation
  const passwordStrength = useMemo((): PasswordStrength => {
    const password = formData.password;
    const criteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    };

    const score = Object.values(criteria).filter(Boolean).length;
    
    let label = 'Weak';
    let color = 'bg-red-500';
    
    if (score >= 4) {
      label = 'Strong';
      color = 'bg-green-500';
    } else if (score >= 3) {
      label = 'Good';
      color = 'bg-blue-500';
    } else if (score >= 2) {
      label = 'Fair';
      color = 'bg-yellow-500';
    }

    return { score, label, color, criteria };
  }, [formData.password]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // First name validation
    // if (!formData.firstName) {
    //   newErrors.firstName = 'First name is required';
    // } else if (formData.firstName.length < 2) {
    //   newErrors.firstName = 'First name must be at least 2 characters';
    // }

    // Last name validation
    // if (!formData.lastName) {
    //   newErrors.lastName = 'Last name is required';
    // } else if (formData.lastName.length < 2) {
    //   newErrors.lastName = 'Last name must be at least 2 characters';
    // }

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 3) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = (field === 'acceptTerms' /* || field === 'subscribeNewsletter' */) 
      ? e.target.checked 
      : e.target.value;
    
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

    // Clear confirm password error if password changes
    if (field === 'password' && errors.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: undefined
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
        general: error instanceof Error ? error.message : 'Registration failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(prev => !prev);
    } else {
      setShowConfirmPassword(prev => !prev);
    }
  };

  const currentIsLoading = isLoading || isSubmitting;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Join TapTest</CardTitle>
        <CardDescription className="text-center">
          <span>
            <span className="font-semibold text-primary">Track</span> progress & <span className="font-semibold text-primary">compete</span> with others
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Google Sign Up Button */}
        <div className="space-y-4">
          <Button
            onClick={() => googleSignup()}
            variant="outline"
            className="w-full relative h-10 border border-border/50 bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            disabled={isSubmitting || isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 mb-3 text-muted-foreground">Or continue with</span>
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
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                <Check className="w-2 h-2 text-white" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                   <span className="sm:hidden text-[11px]">Just pick any username!</span>
                   <span className="hidden sm:inline text-[11px]">No email needed. Pick a username!</span>
                </p>
                {/* <p className="text-blue-700 dark:text-blue-200">
                  Just pick a unique username - no email needed.
                </p> */}
              </div>
            </div>
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="username" className="text-sm font-medium leading-none">
                Username
              </label>
              <div className="flex items-center gap-1">
                {/* Desktop text */}
                <span className="hidden sm:inline text-[10px] text-muted-foreground/60">
                  Can't be changed later
                </span>
                {/* Mobile info button */}
                <div className="relative sm:hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-muted/50"
                    onClick={() => setShowUsernameInfo(!showUsernameInfo)}
                    aria-label="Username information"
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  {showUsernameInfo && (
                    <div className="absolute top-6 right-0 bg-popover text-popover-foreground text-xs p-2 rounded-md shadow-lg border border-border z-10 w-40">
                      <div className="text-center">
                        <p className="text-muted-foreground">Can't be changed later</p>
                      </div>
                      <div className="absolute -top-1 right-2 w-2 h-2 bg-popover border-l border-t border-border rotate-45"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Choose your username"
                value={formData.username}
                onChange={handleInputChange('username')}
                className={`pl-10 ${errors.username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={currentIsLoading}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : 'username-help'}
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
                placeholder="Create a password"
                value={formData.password}
                onChange={handleInputChange('password')}
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={currentIsLoading}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                autoComplete="new-password"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('password')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                disabled={currentIsLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="password-toggle"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div id="password-strength" className="space-y-2" aria-live="polite">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Password strength:</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score >= 3 ? 'text-green-600' : 
                    passwordStrength.score >= 2 ? 'text-blue-600' :
                    passwordStrength.score >= 1 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center gap-1 ${passwordStrength.criteria.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordStrength.criteria.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.criteria.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordStrength.criteria.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Uppercase
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.criteria.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordStrength.criteria.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Lowercase
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.criteria.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordStrength.criteria.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Number
                  </div>
                </div>
              </div>
            )}

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

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={currentIsLoading}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                autoComplete="new-password"
                data-testid="confirmPassword-input"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirmPassword')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                disabled={currentIsLoading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                data-testid="confirmPassword-toggle"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p 
                id="confirmPassword-error" 
                className="text-sm text-red-600"
                role="alert"
                aria-live="polite"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms & Newsletter */}
          <div className="space-y-3">
            <Checkbox
              id="accept-terms"
              label={
                <span>
                  {' '}
                  <button
                    type="button"
                    onClick={onTermsClick}
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                    disabled={currentIsLoading}
                  >
                    Terms and Conditions
                  </button>
                </span>
              }
              checked={formData.acceptTerms}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, acceptTerms: checked }))
              }
              disabled={currentIsLoading}
              data-testid="accept-terms-checkbox"
            />
            {errors.acceptTerms && (
              <p className="text-sm text-red-600" role="alert" aria-live="polite">
                {errors.acceptTerms}
              </p>
            )}

            {/* <Checkbox
              id="subscribe-newsletter"
              label="Subscribe to our newsletter for typing tips and updates"
              checked={formData.subscribeNewsletter}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, subscribeNewsletter: checked }))
              }
              disabled={currentIsLoading}
              data-testid="subscribe-newsletter-checkbox"
            /> */}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={currentIsLoading}
            data-testid="register-button"
          >
            {currentIsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          {/* Sign In Link */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSignInClick}
              className="text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium transition-colors"
              disabled={currentIsLoading}
              data-testid="sign-in-link"
            >
              Sign in
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;