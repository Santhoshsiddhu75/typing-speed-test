import React from 'react';
import { cn } from '@/lib/utils';

interface InitialsAvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * InitialsAvatar Component
 * Generates a colorful avatar with user's initials when no profile picture is available
 */
const InitialsAvatar: React.FC<InitialsAvatarProps> = ({
  username,
  size = 'md',
  className
}) => {
  // Get first character of username for initials
  const getInitials = (name: string): string => {
    if (!name || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
  };

  // Generate consistent color based on username
  const getBackgroundColor = (name: string): string => {
    if (!name) return 'bg-primary';
    
    // Use simple hash to generate consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use CSS custom properties for consistent theming
    // These colors work well with both light and dark themes
    const colors = [
      'bg-primary', // Green theme
      'bg-blue-500',
      'bg-purple-500', 
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-orange-500',
      'bg-red-500',
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Size configurations
  const sizeConfig = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base', 
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl'
  };

  const initials = getInitials(username);
  const backgroundColor = getBackgroundColor(username);

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-semibold shadow-md',
        backgroundColor,
        sizeConfig[size],
        className
      )}
      title={`${username}'s avatar`}
      role="img"
      aria-label={`Avatar for ${username}`}
    >
      {initials}
    </div>
  );
};

export default InitialsAvatar;