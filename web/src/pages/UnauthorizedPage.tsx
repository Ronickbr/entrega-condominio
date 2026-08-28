import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { defaultPathFor } from '@/lib/rbac'

export default function UnauthorizedPage() {
  const { isAuthenticated, role } = useAuth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <ShieldX className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-semibold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para acessar esta página. Se achar que isso é um erro,
          entre em contato com a administração do condomínio.
        </p>
        <Button asChild>
          <Link to={isAuthenticated ? defaultPathFor(role) : '/login'}>
            Voltar para o início
          </Link>
        </Button>
      </div>
    </main>
  )
}