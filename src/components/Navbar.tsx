import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, LogIn, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import FeedbackModal from '@/components/FeedbackModal';

interface NavbarProps {
  showBackButton?: boolean;
  backUrl?: string;
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ 
  showBackButton = true, 
  backUrl = '/',
  className 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Handle nested user object structure
  const actualUser = (user as any)?.user || user;

  // Debug logging for profile picture issues
  React.useEffect(() => {
    if (isAuthenticated && actualUser) {
      console.log('🔍 Navbar - User data:', {
        id: actualUser.id,
        username: actualUser.username,
        profile_picture: actualUser.profile_picture,
        hasProfilePicture: !!actualUser.profile_picture
      });
    }
  }, [isAuthenticated, actualUser]);

  const handleBackClick = () => {
    navigate(backUrl);
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  return (
    <header 
      className={cn(
        "absolute top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm",
        className
      )}
      role="banner"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Back button + Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="text-muted-foreground hover:text-foreground p-1.5 sm:p-2 flex-shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            
            <div className="flex items-center gap-3">
              {/* Mobile logo */}
              <div className="flex items-center gap-2 sm:hidden">
                <img src="/assets/logounpress.png" alt="TapTest" className="h-6 w-6" />
                <span className="font-bold text-foreground text-base">TapTest</span>
              </div>
              {/* Desktop logo */}
              <div className="flex items-center gap-3 hidden sm:flex">
                <img src="/assets/logounpress.png" alt="TapTest" className="h-10 w-10" />
                <span className="font-bold text-foreground text-lg">TapTest</span>
              </div>
            </div>
          </div>

          {/* Right side: Profile/Login + Feedback + Theme Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Profile Picture or Login */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleProfileClick}
              className={cn(
                "relative h-7 w-7 sm:h-10 sm:w-10 rounded-full p-0",
                "border-2 bg-card/80 backdrop-blur-sm",
                "hover:bg-accent transition-all duration-300",
                "shadow-lg hover:shadow-xl",
                "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "overflow-hidden"
              )}
              aria-label={isAuthenticated ? "Go to profile" : "Sign in to your account"}
            >
              {!isAuthenticated && (
                <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              
              {isAuthenticated && (
                <>
                  {actualUser?.profile_picture ? (
                    <img
                      src={actualUser.profile_picture}
                      alt={`${actualUser.username}'s profile picture`}
                      className="h-full w-full object-cover rounded-full"
                      onError={(e) => {
                        console.error('🔍 Failed to load profile picture:', actualUser.profile_picture);
                        // Hide the image and show fallback if image fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    // Fallback avatar for authenticated users without profile pictures
                    <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                      {actualUser?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </>
              )}
            </Button>

            {/* Feedback Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedbackModalOpen(true)}
              className={cn(
                "w-7 h-7 sm:w-10 sm:h-10 rounded-full p-0",
                "border-2 bg-card/80 backdrop-blur-sm",
                "hover:bg-accent transition-all duration-300",
                "shadow-lg hover:shadow-xl",
                "focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
              aria-label="Send feedback"
              title="Send feedback"
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={cn(
                "w-7 h-7 sm:w-10 sm:h-10 rounded-full p-0",
                "border-2 bg-card/80 backdrop-blur-sm",
                "hover:bg-accent transition-all duration-300",
                "shadow-lg hover:shadow-xl",
                "focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              data-testid="theme-toggle"
            >
              <div className="relative w-4 h-4 sm:w-5 sm:h-5">
                <Sun 
                  className={cn(
                    "absolute w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300",
                    theme === 'light' 
                      ? "rotate-0 scale-100 opacity-100" 
                      : "rotate-90 scale-0 opacity-0"
                  )} 
                />
                <Moon 
                  className={cn(
                    "absolute w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300",
                    theme === 'dark' 
                      ? "rotate-0 scale-100 opacity-100" 
                      : "-rotate-90 scale-0 opacity-0"
                  )} 
                />
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        currentPage={location.pathname}
      />
    </header>
  );
};

export default Navbar;