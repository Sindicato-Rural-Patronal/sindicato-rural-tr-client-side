import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

const LANGUAGES = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en',    label: 'English',   flag: '🇺🇸' },
]

export function LanguageToggle({ variant = 'ghost', className }: { variant?: 'ghost' | 'outline'; className?: string }) {
  const { i18n } = useTranslation()
  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={`h-8 px-2 text-xs font-semibold gap-1${className ? ` ${className}` : ''}`}
          aria-label="Selecionar idioma"
        >
          <span>{current.flag} {current.label}</span>
          <ChevronDown className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-35">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={i18n.language === lang.code ? 'font-semibold bg-accent' : ''}
          >
            {lang.flag} {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
