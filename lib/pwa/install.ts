'use client'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

/**
 * Listen for PWA install prompt
 */
export function setupInstallPrompt(
  onPromptAvailable: (event: BeforeInstallPromptEvent) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    onPromptAvailable(deferredPrompt)
  }

  window.addEventListener('beforeinstallprompt', handler)

  return () => {
    window.removeEventListener('beforeinstallprompt', handler)
  }
}

/**
 * Show install prompt
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false
  }

  try {
    await deferredPrompt.prompt()
    const choiceResult = await deferredPrompt.userChoice

    if (choiceResult.outcome === 'accepted') {
      deferredPrompt = null
      return true
    }
  } catch (error) {
    console.error('Error showing install prompt:', error)
  }

  return false
}

/**
 * Check if app is installed
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  // Check for iOS
  if ((window.navigator as any).standalone) {
    return true
  }

  return false
}

