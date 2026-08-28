import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(4,84%,56%)] text-white",
        secondary:
          "border-transparent bg-[hsl(0,0%,20%)] text-[hsl(0,0%,80%)]",
        success:
          "border-transparent bg-[hsl(152,58%,15%)] text-[hsl(152,58%,50%)]",
        warning:
          "border-transparent bg-[hsl(38,90%,15%)] text-[hsl(38,90%,55%)]",
        info:
          "border-transparent bg-[hsl(210,60%,15%)] text-[hsl(210,60%,55%)]",
        destructive:
          "border-transparent bg-[hsl(4,84%,18%)] text-[hsl(4,84%,56%)]",
        outline: "border-[hsl(0,0%,25%)] bg-transparent text-[hsl(0,0%,60%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
