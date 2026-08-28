import { Badge } from '@/components/ui/badge'
import type { badgeVariants } from '@/components/ui/badge'
import {
  AUTH_STATUS_LABELS,
  type AuthStatus,
} from '@/features/authorizations/authorizations.service'

type Variant = NonNullable<Parameters<typeof badgeVariants>[0]>['variant']

const VARIANT: Record<AuthStatus, Variant> = {
  ACTIVE: 'success',
  USED: 'secondary',
  EXPIRED: 'warning',
  CANCELLED: 'destructive',
}

export function AuthStatusBadge({ status }: { status: AuthStatus }) {
  return (
    <Badge variant={VARIANT[status] ?? 'secondary'}>
      {AUTH_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
