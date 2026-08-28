import { Badge } from '@/components/ui/badge'
import type { badgeVariants } from '@/components/ui/badge'
import {
  PACKAGE_STATUS_LABELS,
  PackageStatus,
} from '@/features/packages/package.types'

type Variant = NonNullable<Parameters<typeof badgeVariants>[0]>['variant']

const STATUS_VARIANT: Record<PackageStatus, Variant> = {
  [PackageStatus.RECEBIDA]: 'secondary',
  [PackageStatus.AGUARDANDO_RETIRADA]: 'info',
  [PackageStatus.RETIRADA]: 'success',
  [PackageStatus.RETIRADA_POR_TERCEIRO]: 'success',
  [PackageStatus.NAO_IDENTIFICADA]: 'warning',
  [PackageStatus.DEVOLVIDA]: 'secondary',
  [PackageStatus.CANCELADA]: 'destructive',
}

export function PackageStatusBadge({ status }: { status: PackageStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PACKAGE_STATUS_LABELS[status]}
    </Badge>
  )
}
