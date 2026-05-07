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
  navigator.serviceWorker.register(`${assetBase}sw.js`).catch(() => {});
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
