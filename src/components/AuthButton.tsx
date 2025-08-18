import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AuthButtonProps {
  className?: string;
}

const AuthButton: React.FC<AuthButtonProps> = ({ className }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Debug: Log user data to see what we have
  console.log('AuthButton - User data:', user);
  console.log('AuthButton - Profile picture:', user?.profile_picture);

  const handleClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className={cn(
        "relative h-10 w-10 rounded-full p-0",
        "border-2 bg-card/80 backdrop-blur-sm",
        "hover:bg-accent transition-all duration-300",
        "shadow-lg hover:shadow-xl",
        "focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "overflow-hidden",
        className
      )}
      title={isAuthenticated ? `View profile - ${user?.username}` : 'Sign in to your account'}
    >
      {/* Show login icon when not authenticated */}
      {!isAuthenticated && (
        <LogIn className="h-5 w-5" />
      )}

      {/* Show profile picture when authenticated and available */}
      {isAuthenticated && user && user.profile_picture && (
        <img
          src={user.profile_picture}
          alt={`${user.username}'s profile`}
          className="h-full w-full object-cover rounded-full"
        />
      )}
    </Button>
  );
};

export default AuthButton;