import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import AuthButton from './AuthButton'

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={cn(
      "flex items-center gap-2",
      className || "fixed top-4 right-4 z-50"
    )}>
      <AuthButton />
      <Button
        variant="outline"
        size="sm"
        onClick={toggleTheme}
        className={cn(
          "w-10 h-10 rounded-full p-0",
          "border-2 bg-card/80 backdrop-blur-sm",
          "hover:bg-accent transition-all duration-300",
          "shadow-lg hover:shadow-xl",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2"
        )}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        data-testid="theme-toggle"
      >
        <div className="relative w-5 h-5">
          <Sun 
            className={cn(
              "absolute w-5 h-5 transition-all duration-300",
              theme === 'light' 
                ? "rotate-0 scale-100 opacity-100" 
                : "rotate-90 scale-0 opacity-0"
            )} 
          />
          <Moon 
            className={cn(
              "absolute w-5 h-5 transition-all duration-300",
              theme === 'dark' 
                ? "rotate-0 scale-100 opacity-100" 
                : "-rotate-90 scale-0 opacity-0"
            )} 
          />
        </div>
      </Button>
    </div>
  )
}