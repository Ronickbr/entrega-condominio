import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import './index.css'
import './registerSW'
import App from './App'
import { AuthProvider } from '@/hooks/useAuth'
import { CondominiumProvider } from '@/hooks/useCurrentCondominium'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/hooks/useErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ErrorBoundary>
          <AuthProvider>
            <CondominiumProvider>
              <App />
              <Toaster richColors position="top-center" />
            </CondominiumProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
