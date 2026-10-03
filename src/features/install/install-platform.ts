export type InstallPlatform = 'installed' | 'ios' | 'android' | 'desktop'

/** Onde o Dedic está aberto, para mostrar o passo a passo certo de instalação. */
export function detectInstallPlatform({
  userAgent,
  maxTouchPoints,
  standalone,
}: {
  userAgent: string
  maxTouchPoints: number
  standalone: boolean
}): InstallPlatform {
  if (standalone) return 'installed'
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios'
  // iPadOS em modo desktop se apresenta como Mac, mas tem tela de toque.
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'ios'
  if (/Android/.test(userAgent)) return 'android'
  return 'desktop'
}

/** Lê o ambiente do navegador; separado para manter a regra acima testável. */
export function currentInstallPlatform(): InstallPlatform {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return detectInstallPlatform({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone,
  })
}
