import React from 'react';
import KeyboardBackground from './KeyboardBackground';
import { ThemeOnlyToggle } from './ThemeOnlyToggle';
import Logo from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden ${className}`}>
      {/* Large Background Circle centered */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div 
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 'min(180vh, 90vw)',
            height: 'min(180vh, 90vw)',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            boxShadow: '0 0 80px rgba(34, 197, 94, 0.3), 0 0 160px rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.1)'
          }}
        />
      </div>
      
      {/* Bottom Right Corner Circle */}
      <div className="fixed z-0" style={{ bottom: '-65vh', right: '-55vh' }}>
        <div 
          className="rounded-full pointer-events-none"
          style={{
            width: '100vh',
            height: '100vh',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            boxShadow: '0 0 60px rgba(34, 197, 94, 0.3), 0 0 120px rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.1)'
          }}
        />
      </div>
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:p-6">
        <div>
          <Logo size="small" clickable={false} />
        </div>
        <ThemeOnlyToggle />
      </div>
      {/* Desktop Layout (md+) */}
      <div className="hidden md:flex min-h-screen relative z-10">
        {/* Left Section - 3D Keyboard Background */}
        <div className="relative flex-1 overflow-hidden">
          <KeyboardBackground
            id="keyboard-desktop"
            className="absolute inset-0"
            style={{ zIndex: 0 }}
          />
          
          {/* Subtle gradient overlay for seamless transition - but allow pointer events through */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/10 pointer-events-none"
            style={{ zIndex: 10 }}
          />
        </div>

        {/* Right Section - Form Area */}
        <div className="flex items-center justify-center p-8 pt-20 bg-background/80 backdrop-blur-sm flex-1">
          <div className="w-full max-w-md space-y-6">
            {/* TapTest Logo and Name */}
            <div className="flex flex-col items-center space-y-4 mb-8">
              <Logo size="large" clickable={false} />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Layout (< md) */}
      <div className="md:hidden min-h-screen relative z-10">
        {/* Top Section - 3D Keyboard Background */}
        <div className="relative h-64 overflow-hidden">
          <KeyboardBackground
            id="keyboard-mobile"
            className="absolute inset-0"
            style={{ zIndex: 0 }}
          />
          
          {/* Seamless gradient overlay for smooth transition - but allow pointer events through */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-background/5 to-background/20 pointer-events-none"
            style={{ zIndex: 10 }}
          />
          
          {/* Mobile title overlay - but allow pointer events through */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
            <div className="text-center text-foreground px-4">
              {title && <h1 className="text-2xl font-bold mb-2">{title}</h1>}
              {subtitle && (
                <p className="text-muted-foreground text-sm">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section - Form Area (seamless transition) */}
        <div className="flex items-start justify-center p-6 pt-6 md:pt-20 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-6">
            {/* TapTest Logo and Name */}
            <div className="flex flex-col items-center space-y-4 mb-6">
              <Logo size="medium" clickable={false} />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

/*
Usage Examples:

// Login Page
<AuthLayout 
  title="Sign In" 
  subtitle="Welcome back to your account"
>
  <LoginForm />
</AuthLayout>

// Register Page  
<AuthLayout 
  title="Create Account" 
  subtitle="Join the typing speed community"
>
  <RegisterForm />
</AuthLayout>

// Custom styling
<AuthLayout 
  title="Reset Password"
  className="custom-auth-styles"
>
  <PasswordResetForm />
</AuthLayout>
*/