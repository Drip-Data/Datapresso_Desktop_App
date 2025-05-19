import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Original HTML: .form-control { width: 100%; padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #E5E7EB; background-color: white; font-size: 0.9375rem; color: var(--text-primary); }
          // Original Focus: outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(105, 65, 255, 0.2);
          // The shadcn default is h-10 (40px), rounded-md (6px). Original is 12px padding, 12px radius.
          // We can customize this to be closer to original:
          // "w-full px-4 py-3 rounded-xl border-gray-300 bg-white text-[0.9375rem] text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-2 focus:ring-primary-dark/30"
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }