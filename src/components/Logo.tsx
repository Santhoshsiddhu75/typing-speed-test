import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  showTagline?: boolean;
  clickable?: boolean;
  textClassName?: string;
}

const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'medium',
  showText = true,
  showTagline = true,
  clickable = true,
  textClassName = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const sizeClasses = {
    small: 'h-6 w-6 sm:h-8 sm:w-8',
    medium: 'h-10 w-10 sm:h-12 sm:w-12',
    large: 'h-14 w-14 sm:h-16 sm:w-16'
  };

  const textSizeClasses = {
    small: 'text-base sm:text-lg',
    medium: 'text-lg sm:text-xl',
    large: 'text-2xl sm:text-3xl'
  };

  const handleClick = () => {
    if (clickable) {
      navigate('/');
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div 
      className={`flex items-center gap-2 sm:gap-3 ${clickable ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo Image with Hover Effect */}
      <div className={`relative ${sizeClasses[size]} transition-all duration-200 ease-in-out`}>
        <img
          src="/assets/logounpress.png"
          alt="TapTest Logo"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-in-out ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <img
          src="/assets/logopress.png"
          alt="TapTest Logo Hover"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-in-out ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <span 
            className={`font-bold text-foreground tracking-wide ${textSizeClasses[size]} ${textClassName}`}
          >
            TapTest
          </span>
          {size === 'large' && showTagline && (
            <span className="text-xs sm:text-sm text-muted-foreground mt-1">
              Master Your Typing Speed
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;