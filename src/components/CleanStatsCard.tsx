import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CleanStatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

// Custom hook for counter animation
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    if (end > 0) {
      window.requestAnimationFrame(step);
    }
  }, [end, duration]);

  return count;
};

const CleanStatsCard: React.FC<CleanStatsCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  trendValue,
  className
}) => {
  // Theme detection hook
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Extract numeric value for animation
  const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, '')) || 0;
  const animatedValue = useCountUp(numericValue, 1500);
  
  // Format the animated value back to match the original format
  const displayValue = typeof value === 'number' 
    ? animatedValue 
    : String(value).replace(/\d+/, String(animatedValue));
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      case 'neutral':
        return <Minus className="w-3 h-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-500 dark:text-red-400';
      case 'neutral':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn(
      "hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden",
      className
    )}
    style={{
      background: 'linear-gradient(to top, rgb(34 197 94 / 0.08), rgb(34 197 94 / 0.03), transparent)'
    }}>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="space-y-3 sm:space-y-4">
          {/* Mobile-optimized header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-shrink-0">
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate leading-tight">{title}</p>
            </div>
          </div>
          
          {/* Value section - optimized for mobile */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <p 
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 dark:text-white font-mono tabular-nums leading-none"
                style={{
                  textShadow: isDark 
                    ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                    : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white'
                }}
              >
                {displayValue}
              </p>
          
              {trend && trendValue && (
                <div className={cn("flex items-center gap-1 text-xs sm:text-sm font-medium", getTrendColor())}>
                  {getTrendIcon()}
                  <span className="hidden xs:inline sm:hidden lg:inline">{trendValue}</span>
                </div>
              )}
            </div>
            
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground/80 leading-tight truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CleanStatsCard;