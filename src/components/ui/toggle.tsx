import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onCheckedChange, className, disabled = false, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-7",
      md: "h-5 w-9", 
      lg: "h-6 w-11"
    }

    const thumbSizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5"
    }

    const translateClasses = {
      sm: checked ? "translate-x-3" : "translate-x-0",
      md: checked ? "translate-x-4" : "translate-x-0", 
      lg: checked ? "translate-x-5" : "translate-x-0"
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-muted/30 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background bg-transparent",
          disabled && "cursor-not-allowed opacity-50",
          sizeClasses[size],
          className
        )}
        onClick={() => !disabled && onCheckedChange(!checked)}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none inline-block rounded-full ring-0 transition-all duration-200 ease-in-out absolute top-1/2 transform -translate-y-1/2",
            checked ? "bg-green-500" : "bg-red-500",
            thumbSizeClasses[size],
            translateClasses[size]
          )}
        />
      </button>
    )
  }
)
Toggle.displayName = "Toggle"