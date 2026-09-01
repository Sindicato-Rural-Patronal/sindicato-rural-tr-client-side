import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Dark mode é class-based (.dark no <html>, ver index.css @custom-variant).
// A inicialização (sem flash) fica em main.tsx; aqui só alterna e persiste.
function isDarkNow(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function ThemeToggle() {
  const [dark, setDark] = useState(isDarkNow)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      /* localStorage indisponível — ignora */
    }
  }, [dark])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setDark(d => !d)}
      aria-label={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}
