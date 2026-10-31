// Tema do sistema, guardado no navegador (localStorage `theme`).
//
// 'light' | 'dark' | 'system' valem em todo o sistema (classe `dark` no <html>).
// 'gray' (Cinza) e 'green' (Verde-claro) são só do PAINEL ADMIN: trocam o fundo da
// tela por um tom fosco (os cartões continuam brancos) e, fora do painel, o site
// público fica claro, como sem tema nenhum. O atributo `data-painel` no <html>
// é quem liga as cores novas (index.css) e só existe enquanto a pessoa está no painel.

export type ThemeMode = 'light' | 'dark' | 'system' | 'gray' | 'green'

const MODES: readonly ThemeMode[] = ['light', 'dark', 'system', 'gray', 'green']

/** Valor do atributo `data-painel` de cada tema de painel. */
export const PANEL_THEME_ATTR: Partial<Record<ThemeMode, string>> = { gray: 'cinza', green: 'verde' }

export function isPanelTheme(mode: ThemeMode): boolean {
  return mode in PANEL_THEME_ATTR
}

/** Tema salvo; sem nada (ou valor desconhecido) = segue o sistema operacional. */
export function readStoredTheme(): ThemeMode {
  try {
    const s = localStorage.getItem('theme')
    return (MODES as readonly string[]).includes(s ?? '') ? (s as ThemeMode) : 'system'
  } catch {
    return 'system'
  }
}

/** Escuro só com 'dark', ou 'system' com o sistema operacional no escuro. Cinza e Verde-claro são claros. */
export function isDarkMode(mode: ThemeMode, prefersDark: boolean): boolean {
  return mode === 'dark' || (mode === 'system' && prefersDark)
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/**
 * Aplica o tema salvo no <html>: a classe `dark` e, só quando `inAdmin`, o
 * atributo `data-painel` dos temas Cinza e Verde-claro.
 */
export function syncTheme(inAdmin: boolean): void {
  try {
    const mode = readStoredTheme()
    const root = document.documentElement
    const prefersDark = !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', isDarkMode(mode, prefersDark))
    const attr = inAdmin ? PANEL_THEME_ATTR[mode] : undefined
    if (attr) root.setAttribute('data-painel', attr)
    else root.removeAttribute('data-painel')
  } catch {
    /* localStorage ou matchMedia indisponível — mantém o tema claro padrão */
  }
}

/** Salva o tema e avisa quem escuta (`themechange`). Quem chama já está no painel. */
export function saveTheme(mode: ThemeMode, inAdmin = true): void {
  try {
    localStorage.setItem('theme', mode)
    syncTheme(inAdmin)
    window.dispatchEvent(new Event('themechange'))
  } catch {
    /* localStorage indisponível — ignora */
  }
}
