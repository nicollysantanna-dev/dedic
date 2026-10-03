import { describe, expect, it } from 'vitest'

import { detectInstallPlatform } from '@/features/install/install-platform'

const iphoneSafari =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const iphoneChrome =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1'
const ipadDesktopMode =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const androidChrome =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
const desktopChrome =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

describe('detectInstallPlatform', () => {
  it('app aberto instalado não precisa de instrução', () => {
    expect(
      detectInstallPlatform({
        userAgent: iphoneSafari,
        maxTouchPoints: 5,
        standalone: true,
      }),
    ).toBe('installed')
  })

  it('iPhone no Safari usa o botão Compartilhar', () => {
    expect(
      detectInstallPlatform({
        userAgent: iphoneSafari,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe('ios')
  })

  it('iPhone em outro navegador também é iOS', () => {
    expect(
      detectInstallPlatform({
        userAgent: iphoneChrome,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe('ios')
  })

  it('iPad em modo desktop é reconhecido pelo toque', () => {
    expect(
      detectInstallPlatform({
        userAgent: ipadDesktopMode,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe('ios')
  })

  it('Android usa o menu do Chrome', () => {
    expect(
      detectInstallPlatform({
        userAgent: androidChrome,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe('android')
  })

  it('computador é desktop', () => {
    expect(
      detectInstallPlatform({
        userAgent: desktopChrome,
        maxTouchPoints: 0,
        standalone: false,
      }),
    ).toBe('desktop')
  })
})
