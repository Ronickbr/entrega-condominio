import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logError } from '@/lib/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Error boundary raiz: captura erros fatais de renderização e mostra
 * uma tela amigável com opção de recarregar (sem expor stack).
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logError(error, 'error-boundary')
    logError(info.componentStack, 'error-boundary')
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
          <div className="max-w-sm text-center">
            <TriangleAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-lg font-semibold">Algo deu errado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Recarregue a página para continuar.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}