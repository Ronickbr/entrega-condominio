import { useState, useEffect } from 'react'
import { Check, KeyRound, Loader2, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/cadastros/FormField'
import { confirmCollection, type CollectionResult } from '@/features/packages/collection.service'
import type { PackageListItem } from '@/features/packages/package.service'

interface CollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pkg: PackageListItem | null
  onCollected: (result: CollectionResult) => void
}

/**
 * Modal de confirmação de entrega com solicitação opcional/obrigatória de PIN de 4 dígitos do morador.
 */
export function CollectionModal({ open, onOpenChange, pkg, onCollected }: CollectionModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [residentPin, setResidentPin] = useState('')

  useEffect(() => {
    if (open) {
      setResidentPin('')
    }
  }, [open, pkg])

  async function handleConfirm() {
    if (!pkg || submitting) return
    setSubmitting(true)
    const { data, error } = await confirmCollection(pkg.id, {
      residentPin: residentPin.trim() ? residentPin.trim() : null,
    })
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }
    if (!data) return

    if (data.success) {
      toast.success(data.message)
      onCollected(data)
      onOpenChange(false)
    } else {
      toast.error(data.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            Confirmar entrega
          </DialogTitle>
          <DialogDescription>
            {pkg ? (
              <span>
                Confirmar a retirada de <strong>{pkg.internal_code}</strong> para{' '}
                <strong>
                  {pkg.resident_name ?? pkg.recipient_name_raw ?? 'destinatário não identificado'}
                </strong>
                {pkg.unit_label ? ` · ${pkg.unit_label}` : ''}?
              </span>
            ) : (
              'Nenhuma encomenda selecionada.'
            )}
          </DialogDescription>
        </DialogHeader>

        {pkg && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Código</dt>
                <dd className="font-medium">{pkg.internal_code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Transportadora</dt>
                <dd className="font-medium">{pkg.carrier ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Rastreio</dt>
                <dd className="font-medium">{pkg.tracking_code ?? '—'}</dd>
              </div>
            </dl>

            <FormField label="PIN de 4 dígitos do morador (se cadastrado)">
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={residentPin}
                  onChange={(e) => setResidentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="pl-9 font-mono text-lg tracking-widest"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Insira o PIN numérico do morador caso tenha sido definido.
              </p>
            </FormField>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!pkg || submitting} onClick={() => void handleConfirm()}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando retirada...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmar retirada
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}