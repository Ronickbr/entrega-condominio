import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,13%)] px-3 py-2 text-base text-[hsl(0,0%,93%)] ring-offset-[hsl(0,0%,9%)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[hsl(0,0%,93%)] placeholder:text-[hsl(0,0%,40%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(4,84%,56%)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
