import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Logo from './Logo';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-background via-background to-muted/20 border-t border-border/60 overflow-hidden">
      {/* Subtle background gradient circle */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-96 h-96 opacity-30">
        <div 
          className="w-full h-full rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 40%, transparent 70%)',
          }}
        />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        {/* Mobile - Logo Centered */}
        <div className="flex flex-col items-center justify-center mb-6 md:hidden">
          <Logo size="small" showTagline={false} clickable={true} />
          <p className="text-foreground text-sm mt-2 font-medium">
            Master your typing speed
          </p>
        </div>

        {/* Mobile - Single Column Centered */}
        <div className="space-y-6 mb-8 md:hidden">
          {/* Legal Links */}
          <div className="text-center">
            <nav className="flex flex-col gap-1">
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-primary transition-colors p-0 m-0 bg-transparent border-0"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-primary transition-colors p-0 m-0 bg-transparent border-0"
                >
                  Terms of Service
                </button>
              </div>
              <button
                onClick={() => navigate('/about')}
                className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 p-0 m-0 bg-transparent border-0"
              >
                About
              </button>
            </nav>
          </div>
          
          {/* Contact */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-foreground mb-2">
              <Mail className="w-3 h-3 text-primary" />
              <span className="font-semibold">taptest321@gmail.com</span>
            </div>
            <button
              onClick={() => {
                const feedbackButton = document.querySelector('[aria-label="Send feedback"]') as HTMLButtonElement;
                if (feedbackButton) {
                  feedbackButton.click();
                }
              }}
              className="text-sm text-foreground font-medium hover:text-primary transition-colors"
            >
              Send Feedback →
            </button>
          </div>
        </div>

        {/* Desktop - 3 Column Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8 items-start">
          {/* Left - Logo & Tagline */}
          <div className="space-y-3 text-left">
            <Logo size="small" showTagline={false} clickable={true} />
            <p className="text-foreground text-sm font-medium">
              Master your typing speed
            </p>
          </div>
          
          {/* Center - Legal Links */}
          <div className="text-center">
            <nav className="flex flex-col gap-1">
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-primary transition-colors p-0 m-0 bg-transparent border-0"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-primary transition-colors p-0 m-0 bg-transparent border-0"
                >
                  Terms of Service
                </button>
              </div>
              <button
                onClick={() => navigate('/about')}
                className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 p-0 m-0 bg-transparent border-0"
              >
                About
              </button>
            </nav>
          </div>
          
          {/* Right - Contact */}
          <div className="space-y-3 text-right">
            <div className="flex items-center justify-end gap-2 text-sm text-foreground">
              <Mail className="w-3 h-3 text-primary" />
              <span className="font-semibold">taptest321@gmail.com</span>
            </div>
            <button
              onClick={() => {
                const feedbackButton = document.querySelector('[aria-label="Send feedback"]') as HTMLButtonElement;
                if (feedbackButton) {
                  feedbackButton.click();
                }
              }}
              className="text-sm text-foreground font-medium hover:text-primary transition-colors"
            >
              Send Feedback →
            </button>
          </div>
        </div>

        
        {/* Bottom Section - Clean */}
        <div className="border-t border-border/40 pt-6">
          <div className="text-center">
            <span className="text-sm text-muted-foreground font-medium">
              © {currentYear} TapTest. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;