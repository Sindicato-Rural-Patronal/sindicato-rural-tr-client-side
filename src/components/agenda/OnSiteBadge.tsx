import { Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/** Selo do evento que aparece na página pública de eventos ("no ar", no verde). */
export function OnSiteBadge({ className }: { className?: string }) {
  return (
    <Badge variant="success" className={className} title="Este evento aparece na página de eventos do site">
      <Globe aria-hidden />
      No site
    </Badge>
  )
}
