import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  trendValue,
  className
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'neutral':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'down':
        return 'text-red-500 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'neutral':
        return 'text-muted-foreground bg-muted/50 border-border';
      default:
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  return (
    <Card className={cn("relative overflow-hidden transition-all duration-500 hover:scale-105 group border-0", className)}>
      {/* Animated background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 animate-shimmer" />
      
      <CardContent className="p-8 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500 group-hover:scale-110"></div>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 shadow-2xl group-hover:shadow-white/25 transition-all duration-500 group-hover:scale-110 backdrop-blur-xl border border-white/20">
                  <Icon className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white/70 uppercase tracking-widest group-hover:text-white transition-colors duration-300">{title}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-baseline space-x-3">
                <p className="text-4xl font-black text-white group-hover:text-white/90 transition-colors duration-300 drop-shadow-lg">{value}</p>
                {trend && trendValue && (
                  <div className={cn("flex items-center space-x-2 px-3 py-2 rounded-full backdrop-blur-xl border border-white/20 shadow-lg", getTrendColor())}>
                    {getTrendIcon()}
                    <span className="text-sm font-bold">{trendValue}</span>
                  </div>
                )}
              </div>
              
              {subtitle && (
                <p className="text-lg text-white/80 leading-relaxed font-medium group-hover:text-white transition-colors duration-300">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Multiple decorative elements */}
        <div className="absolute top-3 right-3 w-3 h-3 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
        <div className="absolute bottom-3 right-3 w-2 h-2 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-1/2 right-2 w-1 h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Floating sparkle effect */}
        <div className="absolute top-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;