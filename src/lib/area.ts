// Área do sistema, no atributo `data-area` do <html>: 'painel' (/admin) ou 'site' (o resto).
//
// O site público usa cores de papel (index.css, `html[data-area="site"]`); o painel fica
// neutro. O atributo mora no <html>, e não no layout, para valer também no que abre fora
// dele (diálogos, menus e gavetas vão para o fim do <body>) e nas telas fora do layout
// público (login, /cotacao, convite, 404). main.tsx liga a área certa antes do primeiro
// desenho; o layout do painel troca para 'painel' ao entrar e volta para 'site' ao sair.

export type Area = 'site' | 'painel'

export function areaForPath(pathname: string): Area {
  return pathname === '/admin' || pathname.startsWith('/admin/') ? 'painel' : 'site'
}

export function setArea(area: Area): void {
  try {
    document.documentElement.setAttribute('data-area', area)
  } catch {
    /* sem document (teste/SSR) — ignora */
  }
}
