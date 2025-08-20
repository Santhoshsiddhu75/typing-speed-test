import React from 'react';
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
  // Slot will be used when ads are implemented
  console.log('Ad slot:', slot);
  // Commented out AdSense pushing to prevent console errors
  // This will be uncommented when actual ads are implemented
  // useEffect(() => {
  //   try {
  //     // Only push ads if Google AdSense is loaded
  //     if (typeof window !== 'undefined' && window.adsbygoogle) {
  //       (window.adsbygoogle = window.adsbygoogle || []).push({});
  //     }
  //   } catch (err) {
  //     console.error('AdSense error:', err);
  //   }
  // }, []);

  // Ad size configurations - Will be used when ads are implemented
  // const getAdConfig = () => {
  //   switch (size) {
  //     case 'horizontal':
  //       return {
  //         style: { 
  //           display: 'block',
  //           width: '100%',
  //           height: '90px',
  //           maxWidth: '728px',
  //         },
  //         format: 'auto',
  //         responsive: 'true',
  //         slot: slot
  //       };
  //     case 'rectangle':
  //       return {
  //         style: { 
  //           display: 'block',
  //           width: '300px',
  //           height: '250px',
  //         },
  //         format: 'rectangle',
  //         responsive: 'false',
  //         slot: slot
  //       };
  //     case 'mobile':
  //       return {
  //         style: { 
  //           display: 'block',
  //           width: '100%',
  //           height: '50px',
  //           maxWidth: '320px',
  //         },
  //         format: 'auto',
  //         responsive: 'true',
  //         slot: slot
  //       };
  //     case 'compact':
  //       return {
  //         style: { 
  //           display: 'block',
  //           width: '100%',
  //           height: '60px',
  //           maxWidth: '320px',
  //         },
  //         format: 'auto',
  //         responsive: 'true',
  //         slot: slot
  //       };
  //     default:
  //       return {
  //         style: { 
  //           display: 'block',
  //           width: '100%',
  //           height: '90px',
  //         },
  //         format: 'auto',
  //         responsive: 'true',
  //         slot: slot
  //       };
  //   }
  // };

  // const adConfig = getAdConfig(); // Will be used when ads are implemented

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
      {/* Advertisement placeholder - ready for ad network integration */}
      <div className={cn(
        "flex items-center justify-center text-muted-foreground/60 text-sm",
        "bg-muted/20 border border-muted/40 rounded",
        "hover:bg-muted/30 transition-colors duration-300",
        size === 'horizontal' && "w-full h-[90px] max-w-[728px]",
        size === 'rectangle' && "w-[300px] h-[250px]",
        size === 'mobile' && "w-full h-[50px] max-w-[320px]",
        size === 'compact' && "w-full h-[60px] max-w-[320px]"
      )}>
        <div className="text-center">
          <p className="font-medium text-muted-foreground/70">
            Advertisement Space ({size})
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {size === 'horizontal' && 'Banner: 728×90 Desktop / 320×50 Mobile'}
            {size === 'rectangle' && 'Display: 300×250 Rectangle'}  
            {size === 'mobile' && 'Mobile: 320×50 Banner'}
            {size === 'compact' && 'Compact: 320×60 Banner'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;