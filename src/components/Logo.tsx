import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  showTagline?: boolean;
  clickable?: boolean;
  textClassName?: string;
}

/**
 * The brand mark, and on most pages the way back to the landing page.
 *
 * When clickable this renders a real link rather than a div with an onClick,
 * so it can be tabbed to, opened in a new tab, and middle-clicked — all of
 * which people expect from a site logo.
 */
const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'medium',
  showText = true,
  showTagline = true,
  clickable = true,
  textClassName = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

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

  const content = (
    <>
      {/* Logo Image with Hover Effect */}
      <div className={`relative ${sizeClasses[size]} transition-all duration-200 ease-in-out`}>
        <img
          src="/assets/logounpress-192.webp"
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-in-out ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <img
          src="/assets/logopress-192.webp"
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-in-out ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex-shrink-0">
          <div
            className={`font-bold text-foreground tracking-wide ${textSizeClasses[size]} ${textClassName} whitespace-nowrap`}
          >
            TapTest
          </div>
          {size === 'large' && showTagline && (
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Master Your Typing Speed
            </div>
          )}
        </div>
      )}
    </>
  );

  const hoverHandlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (!clickable) {
    return (
      <div className={`flex items-center gap-3 cursor-default ${className}`} {...hoverHandlers}>
        {content}
      </div>
    );
  }

  return (
    <Link
      to="/"
      aria-label="TapTest home"
      className={`flex items-center gap-3 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      {...hoverHandlers}
    >
      {content}
    </Link>
  );
};

export default Logo;
