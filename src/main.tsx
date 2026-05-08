import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { AuthProvider } from "@/hooks/useAuth"
import App from './App.tsx'

const routerBase = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')
const assetBase = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL

window.addEventListener('unhandledrejection', (event) => {
  console.error('[QXwap] Unhandled promise rejection', event.reason)
})

if ('serviceWorker' in navigator) {
  const currentSwPath = `${assetBase}sw.js`

  const resetServiceWorkers = async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()

    await Promise.all(registrations.map(async (registration) => {
      const scriptUrls = [
        registration.active?.scriptURL,
        registration.installing?.scriptURL,
        registration.waiting?.scriptURL,
      ].filter(Boolean)

      const ownsCurrentBuild = scriptUrls.some((scriptUrl) => {
        try {
          return new URL(scriptUrl as string).pathname === currentSwPath
        } catch {
          return false
        }
      })

      if (!ownsCurrentBuild) {
        await registration.unregister()
      }
    }))

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
    }

    const registration = await navigator.serviceWorker.register(currentSwPath)
    await registration.update()
  }

  resetServiceWorkers().catch((error) => {
    console.warn('[QXwap] Service worker reset failed', error)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBase}>
      <TRPCProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
