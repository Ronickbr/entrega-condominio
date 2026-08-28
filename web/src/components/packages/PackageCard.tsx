import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Package as PackageIcon, Truck } from 'lucide-react'
import type { PackageListItem } from '@/features/packages/package.service'
import { timeAgo } from '@/lib/utils'
import { PackageStatusBadge } from './PackageStatusBadge'

interface PackageCardProps {
  pkg: PackageListItem
  href: string
}

export const PackageCard = memo(function PackageCard({ pkg, href }: PackageCardProps) {
  const isUnidentified = pkg.status === 'NAO_IDENTIFICADA'
  return (
    <Link
      to={href}
      className="block rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)] p-4 transition-colors hover:border-[hsl(4,84%,56%)]/50 hover:bg-[hsl(0,0%,15%)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-[hsl(0,0%,93%)]">
            <PackageIcon className="h-4 w-4 text-[hsl(4,84%,56%)]" />
            {pkg.internal_code}
          </p>
          <p className="mt-1 truncate text-sm text-[hsl(0,0%,60%)]">
            {isUnidentified
              ? pkg.recipient_name_raw || 'Destinatário desconhecido'
              : (pkg.resident_name ?? pkg.recipient_name_raw ?? '—')}
            {pkg.unit_label && !isUnidentified ? ` · ${pkg.unit_label}` : ''}
          </p>
        </div>
        <PackageStatusBadge status={pkg.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(0,0%,50%)]">
        <span className="inline-flex items-center gap-1">
          <Truck className="h-3.5 w-3.5" />
          {pkg.carrier || '—'}
        </span>
        {pkg.tracking_code && <span>Rastreio: {pkg.tracking_code}</span>}
        <span className="ml-auto">{timeAgo(pkg.received_at)}</span>
      </div>
    </Link>
  )
})
