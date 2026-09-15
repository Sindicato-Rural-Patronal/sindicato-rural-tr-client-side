import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'

type Mode = 'light' | 'dark' | 'system'

function currentMode(): Mode {
  try {
    const s = localStorage.getItem('theme')
    if (s === 'light' || s === 'dark') return s
    return 'system'
  } catch {
    return 'system'
  }
}

function applyMode(mode: Mode) {
  try {
    localStorage.setItem('theme', mode)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const dark = mode === 'dark' || (mode === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', !!dark)
    window.dispatchEvent(new Event('themechange'))
  } catch {
    /* localStorage indisponível — ignora */
  }
}

const OPTIONS: { mode: Mode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Claro', Icon: Sun },
  { mode: 'dark', label: 'Escuro', Icon: Moon },
  { mode: 'system', label: 'Sistema', Icon: Monitor },
]

/** Seletor de tema com 3 opções (claro/escuro/sistema). */
export function ThemeSetting() {
  const [mode, setMode] = useState<Mode>(currentMode)

  useEffect(() => {
    const sync = () => setMode(currentMode())
    window.addEventListener('themechange', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('themechange', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function pick(m: Mode) {
    applyMode(m)
    setMode(m)
  }

  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {OPTIONS.map(o => (
        <button
          key={o.mode}
          type="button"
          onClick={() => pick(o.mode)}
          aria-pressed={mode === o.mode}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === o.mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <o.Icon className="size-4" /> {o.label}
        </button>
      ))}
    </div>
  )
}
