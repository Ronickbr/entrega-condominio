import { useState } from 'react'
import { Building2, Mail, MapPin, Pencil, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { FormField } from '@/components/cadastros/FormField'
import { useFormState } from '@/components/cadastros/useFormState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { Role } from '@/types/roles'
import { formatCNPJ, formatPhone } from '@/lib/utils'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  addressToForm,
  updateCondominium,
} from '@/features/cadastros/condominium.service'
import {
  condominiumFormSchema,
  emptyCondominiumForm,
  type CondominiumFormValues,
} from '@/validations/condominium.schema'

const ADDRESS_FIELDS: ReadonlyArray<{
  key: keyof CondominiumFormValues['address']
  label: string
  className?: string
}> = [
  { key: 'street', label: 'Rua' },
  { key: 'number', label: 'Número' },
  { key: 'complement', label: 'Complemento' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'UF', className: 'w-24' },
  { key: 'zipcode', label: 'CEP', className: 'w-40' },
]

export default function CondominiumPage() {
  const { role } = useAuth()
  const { condominium, loading, error, reload } = useCurrentCondominium()
  const form = useFormState(condominiumFormSchema, emptyCondominiumForm)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const canEdit = role === Role.SUPER_ADMIN

  function openEdit() {
    if (!condominium) return
    form.reset({
      name: condominium.name,
      cnpj: condominium.cnpj ?? '',
      phone: condominium.phone ?? '',
      email: condominium.email ?? '',
      syndic_name: condominium.syndic_name ?? '',
      admin_phone: condominium.admin_phone ?? '',
      address: addressToForm(condominium.address),
    })
    setDialogOpen(true)
  }

  async function submit() {
    const data = form.parse()
    if (!data || !condominium) return
    setSaving(true)
    const result = await updateCondominium(condominium.id, data)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Condomínio atualizado com sucesso')
    setDialogOpen(false)
    reload()
  }

  const address = condominium?.address

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Condomínio"
          description="Dados cadastrais do condomínio"
          action={
            canEdit && condominium ? (
              <Button onClick={openEdit} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            ) : undefined
          }
        />

        {loading ? (
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="py-10 text-center text-sm text-[hsl(0,0%,50%)]">
              Carregando...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="py-10 text-center text-sm text-[hsl(4,84%,56%)]">
              {error}
            </div>
          </div>
        ) : !condominium ? (
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="py-10 text-center text-sm text-[hsl(0,0%,50%)]">
              Nenhum condomínio vinculado à sua conta.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="border-b border-[hsl(0,0%,20%)] px-6 py-4">
                <h3 className="flex items-center gap-2 text-base font-medium text-[hsl(0,0%,93%)]">
                  <Building2 className="h-5 w-5 text-[hsl(4,84%,56%)]" />
                  {condominium.name}
                </h3>
                <p className="mt-1 text-sm text-[hsl(0,0%,60%)]">
                  {condominium.cnpj ? `CNPJ ${formatCNPJ(condominium.cnpj)}` : 'CNPJ não informado'}
                </p>
              </div>
              <div className="grid gap-4 p-6 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[hsl(0,0%,50%)]" />
                  <span className="text-[hsl(0,0%,93%)]">{condominium.phone ? formatPhone(condominium.phone) : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[hsl(0,0%,50%)]" />
                  <span className="text-[hsl(0,0%,93%)]">{condominium.email ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[hsl(0,0%,50%)]" />
                  <span className="text-[hsl(0,0%,93%)]">
                    {address
                      ? [address.street, address.number, address.neighborhood, address.city]
                          .filter(Boolean)
                          .join(', ') || 'Endereço não informado'
                      : 'Endereço não informado'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[hsl(0,0%,50%)]" />
                  <span className="text-[hsl(0,0%,93%)]">
                    Síndico: {condominium.syndic_name ?? '—'} ·{' '}
                    {condominium.admin_phone ? formatPhone(condominium.admin_phone) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar condomínio</DialogTitle>
            <DialogDescription>Atualize os dados cadastrais do condomínio.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nome" htmlFor="cond-name" error={form.fieldError('name')}>
                <Input
                  id="cond-name"
                  value={form.values.name}
                  onChange={(e) => form.setField('name', e.target.value)}
                />
              </FormField>
              <FormField label="CNPJ" htmlFor="cond-cnpj" error={form.fieldError('cnpj')}>
                <Input
                  id="cond-cnpj"
                  value={form.values.cnpj}
                  onChange={(e) => form.setField('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </FormField>
              <FormField label="Telefone" htmlFor="cond-phone" error={form.fieldError('phone')}>
                <Input
                  id="cond-phone"
                  value={form.values.phone}
                  onChange={(e) => form.setField('phone', e.target.value)}
                  placeholder="(00) 0000-0000"
                />
              </FormField>
              <FormField label="E-mail" htmlFor="cond-email" error={form.fieldError('email')}>
                <Input
                  id="cond-email"
                  type="email"
                  value={form.values.email}
                  onChange={(e) => form.setField('email', e.target.value)}
                />
              </FormField>
              <FormField
                label="Nome do síndico"
                htmlFor="cond-syndic"
                error={form.fieldError('syndic_name')}
              >
                <Input
                  id="cond-syndic"
                  value={form.values.syndic_name}
                  onChange={(e) => form.setField('syndic_name', e.target.value)}
                />
              </FormField>
              <FormField
                label="Telefone do síndico"
                htmlFor="cond-admin-phone"
                error={form.fieldError('admin_phone')}
              >
                <Input
                  id="cond-admin-phone"
                  value={form.values.admin_phone}
                  onChange={(e) => form.setField('admin_phone', e.target.value)}
                />
              </FormField>
            </div>

            <div className="space-y-4 rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] p-4">
              <p className="text-sm font-medium text-[hsl(0,0%,93%)]">Endereço</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {ADDRESS_FIELDS.map((f) => (
                  <FormField
                    key={f.key}
                    label={f.label}
                    htmlFor={`cond-addr-${f.key}`}
                    className={f.className}
                    error={form.fieldError(`address.${f.key}`)}
                  >
                    <Input
                      id={`cond-addr-${f.key}`}
                      value={form.values.address[f.key]}
                      onChange={(e) =>
                        form.setField('address', {
                          ...form.values.address,
                          [f.key]: e.target.value,
                        })
                      }
                    />
                  </FormField>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
