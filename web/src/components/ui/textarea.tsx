import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,13%)] px-3 py-2 text-base text-[hsl(0,0%,93%)] ring-offset-[hsl(0,0%,9%)] placeholder:text-[hsl(0,0%,40%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(4,84%,56%)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
