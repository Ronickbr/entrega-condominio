import { LoaderCircle } from 'lucide-react'

export function PageLoader({ label = 'Carregando...' }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LoaderCircle className="h-6 w-6 animate-spin" />
        <p className="text-sm">{label}</p>
      </div>
    </main>
  )
}