import { Badge } from '@/components/ui/badge'

export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="success">Ativo</Badge>
  ) : (
    <Badge variant="secondary">Inativo</Badge>
  )
}
