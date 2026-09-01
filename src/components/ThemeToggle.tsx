import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Dark mode é class-based (.dark no <html>, ver index.css @custom-variant).
// A inicialização (sem flash) fica em main.tsx. Aqui NÃO escrevemos localStorage
// no mount (senão a preferência do SO ficaria congelada) — só ao clicar.
function isDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function ThemeToggle() {
  const [dark, setDark] = useState(isDark)

  useEffect(() => {
    // Mantém todas as instâncias (header desktop/mobile, sidebar) e abas em sincronia.
    const sync = () => setDark(isDark())
    window.addEventListener('themechange', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('themechange', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function toggle() {
    const next = !isDark()
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* localStorage indisponível — ignora */
    }
    window.dispatchEvent(new Event('themechange'))
    setDark(next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={toggle}
      aria-label={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}
