import * as React from "react"

import { cn } from "@/lib/utils"
import { formInputClass } from "@/components/shared/formControlTokens"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(formInputClass, "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40", className)}
      {...props}
    />
  )
}

export { Input }
