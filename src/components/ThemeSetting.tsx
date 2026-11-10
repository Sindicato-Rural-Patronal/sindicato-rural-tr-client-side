import { useEffect, useState } from 'react'
import { Leaf, Moon, Monitor, Palette, Sun } from 'lucide-react'
import { readStoredTheme, saveTheme, type ThemeMode } from '@/lib/theme'

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Claro', Icon: Sun },
  { mode: 'dark', label: 'Escuro', Icon: Moon },
  { mode: 'system', label: 'Sistema', Icon: Monitor },
  { mode: 'gray', label: 'Cinza', Icon: Palette },
  { mode: 'green', label: 'Verde-claro', Icon: Leaf },
]

/**
 * Seletor de tema do painel: claro, escuro, sistema, cinza e verde-claro.
 * Cinza e Verde-claro (fundo fosco, cartões brancos) valem só no painel admin;
 * o site público continua claro mesmo com um deles salvo. A escolha fica no
 * navegador (localStorage `theme`), como a de sempre.
 */
export function ThemeSetting() {
  const [mode, setMode] = useState<ThemeMode>(readStoredTheme)

  useEffect(() => {
    const sync = () => setMode(readStoredTheme())
    window.addEventListener('themechange', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('themechange', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function pick(m: ThemeMode) {
    saveTheme(m, true)
    setMode(m)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* O escolhido: um tom acima, com a linha fina e o ícone verde (como o item ativo do menu). */}
      <div role="group" aria-label="Tema do painel" className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-border bg-muted p-0.5">
        {OPTIONS.map(o => (
          <button
            key={o.mode}
            type="button"
            onClick={() => pick(o.mode)}
            aria-pressed={mode === o.mode}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
              mode === o.mode
                ? 'bg-card text-foreground shadow-xs ring-1 ring-border [&_svg]:text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <o.Icon className="size-4" /> {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Cinza e Verde-claro mudam só o fundo do painel; o site público continua claro.
      </p>
    </div>
  )
}
