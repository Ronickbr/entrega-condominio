import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PermissionDeniedStateProps {
  reason?: string
}

/** Estado de permissão negada (403) com explicação e voltar. */
export function PermissionDeniedState({
  reason = 'Você não tem permissão para acessar este recurso.',
}: PermissionDeniedStateProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" />
      <h1 className="text-lg font-semibold">Acesso negado</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{reason}</p>
      <Button variant="outline" className="mt-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>
    </div>
  )
}