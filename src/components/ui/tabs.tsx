import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// Abas (SR-080): um estilo só para o sistema inteiro — texto secundário, a aba ativa em
// texto principal com uma linha verde embaixo, e uma linha fina sob a barra toda. As
// variantes antigas ("default", a pílula cinza, e "line", o sublinhado) continuam
// aceitas e desenham o mesmo.

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-4 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex items-center justify-start gap-4 text-muted-foreground group-data-horizontal/tabs:h-9 group-data-horizontal/tabs:w-full group-data-horizontal/tabs:border-b group-data-horizontal/tabs:border-border group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:items-stretch group-data-vertical/tabs:gap-0.5 group-data-vertical/tabs:border-r group-data-vertical/tabs:border-border",
  {
    variants: {
      // Apelidos da API antiga: os dois desenham o estilo único.
      variant: {
        default: "",
        line: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full items-center justify-center gap-1.5 rounded-md px-0.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none group-data-vertical/tabs:h-9 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-active:[&_svg]:text-primary",
        // A linha da aba ativa (verde, 2 px), sobre a linha fina da barra.
        "after:absolute after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-px group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-1 group-data-vertical/tabs:after:-right-px group-data-vertical/tabs:after:w-0.5 data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

/**
 * Para barras com muitas abas, no celular: as abas quebram de linha e a barra
 * cresce junto (a altura padrão é fixa, 36 px). Cada aba fica com 36 px, a linha
 * verde da ativa continua embaixo dela, e a linha fina da barra fica sob a última
 * fileira. Com uma fileira só, nada muda.
 */
export const tabsWrapClass =
  "max-w-full flex-wrap gap-x-4 gap-y-0 group-data-horizontal/tabs:h-auto group-data-horizontal/tabs:min-h-9 [&_[data-slot=tabs-trigger]]:h-9"

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
