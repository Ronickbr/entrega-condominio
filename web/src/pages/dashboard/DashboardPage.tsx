import { lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Role } from '@/types/roles'
import { PageLoader } from '@/components/auth/PageLoader'

const AdminDashboardPage = lazy(() => import('./AdminDashboardPage'))
const SyndicDashboardPage = lazy(() => import('./SyndicDashboardPage'))

/**
 * Roteador de dashboard por papel (Etapa 9):
 * SUPER_ADMIN → painel administrativo; SYNDIC → indicadores + gráficos.
 * Páginas carregadas sob demanda (code-splitting do recharts).
 */
export default function DashboardPage() {
  const { role } = useAuth()
  return (
    <Suspense fallback={<PageLoader label="Carregando..." />}>
      {role === Role.SUPER_ADMIN ? <AdminDashboardPage /> : <SyndicDashboardPage />}
    </Suspense>
  )
}