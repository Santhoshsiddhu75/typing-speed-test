import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string | React.ReactNode
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, onCheckedChange, checked, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(false)
    const checkboxId = id || React.useId()
    
    const isChecked = checked !== undefined ? checked : internalChecked
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked
      if (checked === undefined) {
        setInternalChecked(newChecked)
      }
      onCheckedChange?.(newChecked)
    }
    
    return (
      <div className="flex items-center space-x-2">
        <div className="relative">
          <input
            type="checkbox"
            id={checkboxId}
            ref={ref}
            checked={isChecked}
            onChange={handleChange}
            className={cn(
              "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sr-only",
              className
            )}
            {...props}
          />
          <div 
            className={cn(
              "h-4 w-4 rounded-sm border border-primary bg-transparent flex items-center justify-center transition-colors cursor-pointer",
              isChecked && "bg-primary text-primary-foreground",
              props.disabled && "cursor-not-allowed opacity-50"
            )}
            onClick={() => !props.disabled && document.getElementById(checkboxId)?.click()}
          >
            <Check className={cn(
              "h-3 w-3 transition-opacity",
              isChecked ? "opacity-100" : "opacity-0"
            )} />
          </div>
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className={cn(
              "text-sm font-medium leading-none cursor-pointer",
              props.disabled && "cursor-not-allowed opacity-70"
            )}
          >
            {label}
          </label>
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }