import { forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<typeof Button>

interface PermissionButtonProps extends ButtonProps {
  allowed: boolean
  noPermissionMessage?: string
}

export const PermissionButton = forwardRef<HTMLButtonElement, PermissionButtonProps>(
  ({ allowed, noPermissionMessage = 'Você não tem permissão para esta ação', children, disabled, ...props }, ref) => {
    if (allowed) {
      return (
        <Button ref={ref} disabled={disabled} {...props}>
          {children}
        </Button>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button ref={ref} disabled {...props} style={{ pointerEvents: 'none' }}>
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{noPermissionMessage}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
)

PermissionButton.displayName = 'PermissionButton'
