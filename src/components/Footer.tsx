import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Logo from './Logo';
import { CONTACT_EMAIL } from '@/lib/seo';

/**
 * The legal links were buttons calling navigate(). A button is invisible to a
 * crawler, cannot be opened in a new tab, and cannot be middle-clicked, so
 * About, Privacy, Terms and Contact had nothing pointing at them at all. They
 * are real links now; the classes are unchanged, so is the look.
 *
 * "Send Feedback" stays a button on purpose. It opens the feedback modal in
 * place, which lives in Navbar — so it works on /start and /profile, which
 * render that bar, and does nothing on the landing page, which does not.
 * That last part is a known bug, left alone here rather than traded for a
 * page navigation on the two screens where the button already worked.
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const legalLinkClass =
    'hover:text-primary transition-colors p-0 m-0 bg-transparent border-0';

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
                <Link to="/privacy" className={legalLinkClass}>
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link to="/terms" className={legalLinkClass}>
                  Terms of Service
                </Link>
              </div>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
                <Link to="/about" className={legalLinkClass}>
                  About
                </Link>
                <span>•</span>
                <Link to="/contact" className={legalLinkClass}>
                  Contact
                </Link>
              </div>
            </nav>
          </div>

          {/* Contact */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-foreground mb-2">
              <Mail className="w-3 h-3 text-primary" />
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold hover:text-primary transition-colors">
                {CONTACT_EMAIL}
              </a>
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
                <Link to="/privacy" className={legalLinkClass}>
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link to="/terms" className={legalLinkClass}>
                  Terms of Service
                </Link>
              </div>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
                <Link to="/about" className={legalLinkClass}>
                  About
                </Link>
                <span>•</span>
                <Link to="/contact" className={legalLinkClass}>
                  Contact
                </Link>
              </div>
            </nav>
          </div>

          {/* Right - Contact */}
          <div className="space-y-3 text-right">
            <div className="flex items-center justify-end gap-2 text-sm text-foreground">
              <Mail className="w-3 h-3 text-primary" />
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold hover:text-primary transition-colors">
                {CONTACT_EMAIL}
              </a>
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