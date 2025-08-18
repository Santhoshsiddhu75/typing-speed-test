import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AdBannerProps {
  size: 'horizontal' | 'rectangle' | 'mobile' | 'compact';
  className?: string;
  slot?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdBanner: React.FC<AdBannerProps> = ({ size, className, slot = "1234567890" }) => {
  useEffect(() => {
    try {
      // Only push ads if Google AdSense is loaded
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  // Ad size configurations
  const getAdConfig = () => {
    switch (size) {
      case 'horizontal':
        return {
          style: { 
            display: 'block',
            width: '100%',
            height: '90px',
            maxWidth: '728px',
          },
          format: 'auto',
          responsive: 'true',
          slot: slot
        };
      case 'rectangle':
        return {
          style: { 
            display: 'block',
            width: '300px',
            height: '250px',
          },
          format: 'rectangle',
          responsive: 'false',
          slot: slot
        };
      case 'mobile':
        return {
          style: { 
            display: 'block',
            width: '100%',
            height: '50px',
            maxWidth: '320px',
          },
          format: 'auto',
          responsive: 'true',
          slot: slot
        };
      case 'compact':
        return {
          style: { 
            display: 'block',
            width: '100%',
            height: '60px',
            maxWidth: '320px',
          },
          format: 'auto',
          responsive: 'true',
          slot: slot
        };
      default:
        return {
          style: { 
            display: 'block',
            width: '100%',
            height: '90px',
          },
          format: 'auto',
          responsive: 'true',
          slot: slot
        };
    }
  };

  const adConfig = getAdConfig();

  return (
    <div className={cn(
      "ad-banner-container flex justify-center items-center",
      "bg-muted/20 border border-dashed border-muted-foreground/30 rounded-lg",
      "transition-all duration-300 hover:bg-muted/30",
      size === 'horizontal' && "w-full max-w-4xl mx-auto py-4",
      size === 'rectangle' && "w-[300px] h-[250px]",
      size === 'mobile' && "w-full max-w-xs mx-auto py-2",
      size === 'compact' && "w-full max-w-xs mx-auto py-2",
      className
    )}>
      {/* Development placeholder - replace with actual AdSense when ready */}
      {process.env.NODE_ENV === 'development' ? (
        <div className={cn(
          "flex items-center justify-center text-muted-foreground text-sm",
          "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
          "border border-blue-200 dark:border-blue-800 rounded",
          size === 'horizontal' && "w-full h-[90px] max-w-[728px]",
          size === 'rectangle' && "w-[300px] h-[250px]",
          size === 'mobile' && "w-full h-[50px] max-w-[320px]",
          size === 'compact' && "w-full h-[60px] max-w-[320px]"
        )}>
          <div className="text-center">
            <p className="font-medium text-blue-600 dark:text-blue-400">
              Ad Space ({size})
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
              {size === 'horizontal' && '728x90 Desktop / 320x50 Mobile'}
              {size === 'rectangle' && '300x250 Rectangle'}  
              {size === 'mobile' && '320x50 Mobile Banner'}
              {size === 'compact' && '320x60 Compact Banner'}
            </p>
          </div>
        </div>
      ) : (
        <ins
          className="adsbygoogle"
          style={adConfig.style}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX" // Replace with your AdSense publisher ID
          data-ad-slot={adConfig.slot}
          data-ad-format={adConfig.format}
          data-full-width-responsive={adConfig.responsive}
        />
      )}
    </div>
  );
};

export default AdBanner;