import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { defaultPathFor, DASHBOARD_ROLES, ADMIN_ROLES, RECEIVING_ROLES, RESIDENT_ROLES, AUTHENTICATED_ROLES } from '@/lib/rbac'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageLoader } from '@/components/auth/PageLoader'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const CallbackPage = lazy(() => import('@/pages/auth/CallbackPage'))
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const CondominiumPage = lazy(() => import('@/pages/dashboard/CondominiumPage'))
const BuildingsPage = lazy(() => import('@/pages/dashboard/BuildingsPage'))
const UnitsPage = lazy(() => import('@/pages/dashboard/UnitsPage'))
const ResidentsPage = lazy(() => import('@/pages/dashboard/ResidentsPage'))
const StaffPage = lazy(() => import('@/pages/dashboard/StaffPage'))
const WhatsAppLogsPage = lazy(() => import('@/pages/dashboard/WhatsAppLogsPage'))
const SyndicReportsPage = lazy(() => import('@/pages/dashboard/SyndicReportsPage'))
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'))
const AuditLogsPage = lazy(() => import('@/pages/dashboard/AuditLogsPage'))
const RecebimentoPage = lazy(() => import('@/pages/recebimento/ReceptionPackagesListPage'))
const ReceptionDashboardPage = lazy(() => import('@/pages/recebimento/ReceptionDashboardPage'))
const NewPackagePage = lazy(() => import('@/pages/recebimento/NewPackagePage'))
const PackageDetailPage = lazy(() => import('@/pages/recebimento/PackageDetailPage'))
const ReceptionCollectionPage = lazy(() => import('@/pages/recebimento/ReceptionCollectionPage'))
const MinhasEncomendasPage = lazy(() => import('@/pages/minhas-encomendas/AppPackagesPage'))
const AppPackageDetailPage = lazy(() => import('@/pages/minhas-encomendas/AppPackageDetailPage'))
const AppNotificationsPage = lazy(() => import('@/pages/app/AppNotificationsPage'))
const AppAuthorizationsPage = lazy(() => import('@/pages/app/AppAuthorizationsPage'))
const NewAuthorizationPage = lazy(() => import('@/pages/app/NewAuthorizationPage'))
const AuthorizationDetailPage = lazy(() => import('@/pages/app/AuthorizationDetailPage'))
const PrivacyPage = lazy(() => import('@/pages/app/PrivacyPage'))
const MyApartmentPage = lazy(() => import('@/pages/app/MyApartmentPage'))
const ThirdPartyCollectionPage = lazy(() => import('@/pages/recebimento/ThirdPartyCollectionPage'))

function RootRedirect() {
  const { isReady, isAuthenticated, role } = useAuth()

  if (!isReady) return <PageLoader label="Carregando..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={defaultPathFor(role)} replace />
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader label="Carregando página..." />}>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LazyRoute><LoginPage /></LazyRoute>} />
      <Route path="/auth/callback" element={<LazyRoute><CallbackPage /></LazyRoute>} />
      <Route path="/unauthorized" element={<LazyRoute><UnauthorizedPage /></LazyRoute>} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><DashboardPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/condominio"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><CondominiumPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/blocos"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><BuildingsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/unidades"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><UnitsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/moradores"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><ResidentsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/funcionarios"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><StaffPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/whatsapp-logs"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><WhatsAppLogsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/relatorios"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><SyndicReportsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/configuracoes"
        element={
          <ProtectedRoute roles={DASHBOARD_ROLES}>
            <LazyRoute><SettingsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/audit"
        element={
          <ProtectedRoute roles={ADMIN_ROLES}>
            <LazyRoute><AuditLogsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notificacoes"
        element={
          <ProtectedRoute roles={AUTHENTICATED_ROLES}>
            <LazyRoute><AppNotificationsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recebimento"
        element={
          <ProtectedRoute roles={RECEIVING_ROLES}>
            <LazyRoute><RecebimentoPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recebimento/dashboard"
        element={
          <ProtectedRoute roles={RECEIVING_ROLES}>
            <LazyRoute><ReceptionDashboardPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recebimento/novo"
        element={
          <ProtectedRoute roles={RECEIVING_ROLES}>
            <LazyRoute><NewPackagePage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recebimento/retirada"
        element={
          <ProtectedRoute roles={RECEIVING_ROLES}>
            <LazyRoute><ReceptionCollectionPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recebimento/terceiros"
        element={
          <ProtectedRoute roles={RECEIVING_ROLES}>
            <LazyRoute><ThirdPartyCollectionPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recebimento/:id"
        element={
          <ProtectedRoute roles={RECEIVING_ROLES}>
            <LazyRoute><PackageDetailPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/minhas-encomendas"
        element={
          <ProtectedRoute roles={RESIDENT_ROLES}>
            <LazyRoute><MinhasEncomendasPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/minhas-encomendas/:id"
        element={
          <ProtectedRoute roles={RESIDENT_ROLES}>
            <LazyRoute><AppPackageDetailPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/minhas-autorizacoes"
        element={
          <ProtectedRoute roles={RESIDENT_ROLES}>
            <LazyRoute><AppAuthorizationsPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/minhas-autorizacoes/novo"
        element={
          <ProtectedRoute roles={RESIDENT_ROLES}>
            <LazyRoute><NewAuthorizationPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/minhas-autorizacoes/:id"
        element={
          <ProtectedRoute roles={RESIDENT_ROLES}>
            <LazyRoute><AuthorizationDetailPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/privacidade"
        element={
          <ProtectedRoute roles={RESIDENT_ROLES}>
            <LazyRoute><PrivacyPage /></LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meu-apartamento"
        element={
          <ProtectedRoute roles={RESIDENT_ROLES}>
            <LazyRoute><MyApartmentPage /></LazyRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
