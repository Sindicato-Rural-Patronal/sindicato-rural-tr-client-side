import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Etiqueta de situação (SR-080): um estilo só — pequena (20 px, texto de 12), cantos de
// 6 px, fundo suave e o texto na cor do tom. Tons: neutral, success, warning e danger.
// As variantes antigas continuam como apelidos: default = success (era a etiqueta cheia
// de "Ativo"/"No site"), secondary = neutral, destructive = danger; outline é a neutra
// só com a linha, para etiquetas que não são situação ("Parceira", "Nota").
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground [a]:hover:bg-accent",
        success: "bg-success-soft text-success [a]:hover:bg-success/15",
        warning: "bg-warning-soft text-warning [a]:hover:bg-warning/15",
        danger:
          "bg-destructive-soft text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/15",
        // Apelidos (API antiga).
        default: "bg-success-soft text-success [a]:hover:bg-success/15",
        secondary: "bg-muted text-muted-foreground [a]:hover:bg-accent",
        destructive:
          "bg-destructive-soft text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/15",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/** Tom de uma etiqueta de situação. */
export type BadgeTone = "neutral" | "success" | "warning" | "danger"

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
