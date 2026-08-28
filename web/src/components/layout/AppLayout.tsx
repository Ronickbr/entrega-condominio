import { memo, useCallback, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Building2,
  DoorOpen,
  FileSpreadsheet,
  HardHat,
  Home,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Package,
  PackageCheck,
  PackagePlus,
  Settings,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { GlobalSearchBar } from '@/components/dashboard/GlobalSearchBar'
import { OfflineState } from '@/components/OfflineState'
import { ROLE_LABELS, Role } from '@/types/roles'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavItem {
  to: string
  label: string
  end?: boolean
  icon: ComponentType<{ className?: string }>
}

const DASHBOARD_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/dashboard/condominio', label: 'Condomínio', icon: Building2 },
  { to: '/dashboard/blocos', label: 'Blocos', icon: Layers },
  { to: '/dashboard/unidades', label: 'Unidades', icon: DoorOpen },
  { to: '/dashboard/moradores', label: 'Moradores', icon: Users },
  { to: '/dashboard/funcionarios', label: 'Funcionários', icon: HardHat },
  { to: '/dashboard/whatsapp-logs', label: 'WhatsApp', icon: MessageCircle },
  { to: '/dashboard/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
  { to: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/dashboard/audit', label: 'Auditoria', icon: ShieldCheck },
]

const RECEPTION_NAV: NavItem[] = [
  { to: '/recebimento/dashboard', label: 'Portaria', end: true, icon: LayoutDashboard },
  { to: '/recebimento', label: 'Encomendas', end: true, icon: Package },
  { to: '/recebimento/novo', label: 'Nova encomenda', icon: PackagePlus },
  { to: '/recebimento/retirada', label: 'Retirada', icon: PackageCheck },
  { to: '/recebimento/terceiros', label: 'Terceiros', icon: UserCheck },
]

const RESIDENT_NAV: NavItem[] = [
  { to: '/minhas-encomendas', label: 'Minhas encomendas', end: true, icon: Package },
  { to: '/minhas-autorizacoes', label: 'Autorizações', end: true, icon: ShieldCheck },
  { to: '/meu-apartamento', label: 'Meu apartamento', icon: Home },
  { to: '/privacidade', label: 'Privacidade', icon: Lock },
]

function isDashboardRole(role: Role | null): boolean {
  return role === Role.SUPER_ADMIN || role === Role.SYNDIC
}

function isResidentRole(role: Role | null): boolean {
  return role === Role.RESIDENT
}

function isReceptionRole(role: Role | null): boolean {
  return role === Role.DOORMAN || role === Role.RECEPTIONIST
}

function initials(name: string | undefined | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

const NavLinks = memo(function NavLinks({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-[hsl(4,84%,56%)]/15 text-[hsl(4,84%,56%)]'
                : 'text-[hsl(0,0%,60%)] hover:bg-[hsl(0,0%,15%)] hover:text-[hsl(0,0%,93%)]',
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
})

const Brand = memo(function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(4,84%,56%)] text-white">
        <PackageCheck className="h-[18px] w-[18px]" />
      </span>
      <span className="text-[15px] font-semibold leading-tight tracking-tight text-[hsl(0,0%,93%)]">
        Gestão de
        <br />
        Encomendas
      </span>
    </div>
  )
})

function SidebarContent({ profile, role, onSignOut, onToggleTheme, theme }: {
  profile: { full_name?: string | null } | null
  role: Role | null
  onSignOut: () => void
  onToggleTheme: () => void
  theme: string | undefined
}) {
  return (
    <div className="flex h-full flex-col">
      <Brand />

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <NavLinks
          items={
            isDashboardRole(role)
              ? DASHBOARD_NAV.filter((i) => i.to !== '/dashboard/audit' || role === Role.SUPER_ADMIN)
              : isReceptionRole(role)
                ? RECEPTION_NAV
                : isResidentRole(role)
                  ? RESIDENT_NAV
                  : []
          }
        />
      </div>

      <div className="border-t border-[hsl(0,0%,18%)] p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(4,84%,56%)] text-xs font-semibold text-white">
            {initials(profile?.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[hsl(0,0%,93%)]">{profile?.full_name}</p>
            {role && <p className="truncate text-xs text-[hsl(0,0%,60%)]">{ROLE_LABELS[role]}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema"
            className="text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)]"
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Sair" className="text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)]" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

const MemoSidebarContent = memo(SidebarContent)

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const handleSignOut = useCallback(() => {
    void signOut()
  }, [signOut])

  const showSearch = !isResidentRole(role)

  const sidebarProps = { profile, role, onSignOut: handleSignOut, onToggleTheme: handleToggleTheme, theme }

  return (
    <div className="min-h-screen bg-[hsl(0,0%,9%)]">
      <OfflineState />

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] lg:block">
          <MemoSidebarContent {...sidebarProps} />
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          >
            <aside
              className="h-full w-72 max-w-[85%] border-r border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[hsl(0,0%,18%)] px-3 py-3">
                <span className="text-sm font-semibold text-[hsl(0,0%,93%)]">Menu</span>
                <Button variant="ghost" size="icon" aria-label="Fechar menu" className="text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)]" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <MemoSidebarContent {...sidebarProps} />
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] px-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,18%)]"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {showSearch && <GlobalSearchBar />}
              <NotificationCenter />
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
