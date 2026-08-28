import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, FileImage, Loader2, PackageCheck, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { FormField } from '@/components/cadastros/FormField'
import { useFormState } from '@/components/cadastros/useFormState'
import { Tabs } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ResidentSelector } from '@/components/packages/ResidentSelector'
import { LabelScanner } from '@/components/packages/LabelScanner'
import type { OcrConfirmValues } from '@/components/packages/OcrResult'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import { useOfflineReplay } from '@/hooks/useOfflineReplay'
import {
  createPackage,
  listResidentOptions,
  type ResidentOption,
} from '@/features/packages/package.service'
import {
  dataUrlToFile,
  fileToDataUrl,
  isNetworkError,
  savePackageDraft,
  type PackageDraft,
} from '@/lib/offline'
import {
  emptyPackageForm,
  packageFormSchema,
} from '@/features/packages/package.schema'

export default function NewPackagePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [tab, setTab] = useState<'manual' | 'camera'>('manual')
  const [residents, setResidents] = useState<ResidentOption[]>([])
  const [selected, setSelected] = useState<ResidentOption | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const form = useFormState(packageFormSchema, emptyPackageForm)

  useEffect(() => {
    if (!condominium) return
    listResidentOptions()
      .then(setResidents)
      .catch(() => setResidents([]))
  }, [condominium])

  async function submit() {
    const data = form.parse()
    if (!data || !condominium || !user) return
    setSaving(true)
    const result = await createPackage(
      condominium.id,
      user.id,
      selected?.unit_id ?? null,
      data,
      photo,
    )
    setSaving(false)
    if (result.error) {
      if (isNetworkError(result.error)) {
        await savePackageDraft({
          condominiumId: condominium.id,
          unitId: selected?.unit_id ?? null,
          residentId: data.resident_id,
          recipientNameRaw: data.recipient_name_raw,
          carrier: data.carrier,
          trackingCode: data.tracking_code,
          notes: data.notes,
          photoDataUrl: photo ? await fileToDataUrl(photo) : null,
        })
        toast.error('Sem conexão. Encomenda salva localmente e será reenviada ao reconectar.')
      } else {
        toast.error(result.error)
      }
      return
    }
    toast.success('Encomenda cadastrada')
    navigate('/recebimento', { replace: true })
  }

  async function replayDraft(draft: PackageDraft) {
    if (!condominium || !user) throw new Error('sem sessão')
    const photoFile = draft.photoDataUrl
      ? await dataUrlToFile(draft.photoDataUrl, 'etiqueta-offline.jpeg')
      : null
    const result = await createPackage(
      draft.condominiumId,
      user.id,
      draft.unitId,
      {
        resident_id: draft.residentId,
        recipient_name_raw: draft.recipientNameRaw ?? '',
        carrier: draft.carrier ?? '',
        tracking_code: draft.trackingCode ?? '',
        notes: draft.notes ?? '',
      },
      photoFile,
    )
    if (result.error) throw new Error(result.error)
  }

  useOfflineReplay({ onReplay: (draft) => replayDraft(draft) })

  async function submitOcr(values: OcrConfirmValues) {
    if (!condominium || !user) return
    setSaving(true)
    const result = await createPackage(
      condominium.id,
      user.id,
      values.resident?.unit_id ?? null,
      {
        resident_id: values.resident?.resident_id ?? null,
        recipient_name_raw: values.recipient_name_raw,
        carrier: values.carrier,
        tracking_code: values.tracking_code,
        notes: '',
      },
      values.photo ?? null,
    )
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Encomenda cadastrada')
    navigate('/recebimento', { replace: true })
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Nova encomenda"
          description="Cadastro manual de recebimento na portaria"
          action={
            <Button variant="outline" onClick={() => navigate('/recebimento')} disabled={saving} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          }
        />

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'manual' | 'camera')}
          items={[
            { value: 'camera', label: '📷 Fotografar' },
            { value: 'manual', label: 'Manual' },
          ]}
        />

        {tab === 'camera' ? (
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-[hsl(0,0%,93%)]">
                <Camera className="h-5 w-5 text-[hsl(4,84%,56%)]" />
                Fotografar etiqueta
              </h3>
              <p className="mt-1 text-xs text-[hsl(0,0%,60%)]">
                Aponte a câmera para a etiqueta: os campos são reconhecidos automaticamente (OCR) e
                o destinatário é sugerido por matching com os moradores.
              </p>
            </div>
            <div className="p-4">
              <LabelScanner
                condominiumId={condominium?.id ?? ''}
                residents={residents}
                busy={saving}
                onConfirm={(values) => void submitOcr(values)}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-[hsl(0,0%,93%)]">
                <Truck className="h-5 w-5 text-[hsl(4,84%,56%)]" />
                Cadastro manual
              </h3>
              <p className="mt-1 text-xs text-[hsl(0,0%,60%)]">
                Informe o morador e os dados da encomenda. A foto da etiqueta é opcional.
              </p>
            </div>
            <div className="space-y-4 p-4">
              <FormField
                label="Morador"
                error={form.fieldError('resident_id') ?? form.fieldError('recipient_name_raw')}
              >
                <ResidentSelector
                  options={residents}
                  value={selected}
                  onChange={(r) => {
                    setSelected(r)
                    form.setField('resident_id', r?.resident_id ?? null)
                    form.setField('recipient_name_raw', r?.is_household ? r.full_name : '')
                  }}
                  disabled={!condominium || condoLoading || saving}
                />
              </FormField>

              {!selected && (
                <FormField
                  label="Nome na etiqueta"
                  htmlFor="pkg-recipient"
                  error={form.fieldError('recipient_name_raw')}
                >
                  <Input
                    id="pkg-recipient"
                    value={form.values.recipient_name_raw}
                    onChange={(e) => form.setField('recipient_name_raw', e.target.value)}
                    placeholder="Nome impresso na etiqueta (encomenda não identificada)"
                  />
                </FormField>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Transportadora" htmlFor="pkg-carrier" error={form.fieldError('carrier')}>
                  <Input
                    id="pkg-carrier"
                    value={form.values.carrier}
                    onChange={(e) => form.setField('carrier', e.target.value)}
                    placeholder="Ex.: Correios"
                  />
                </FormField>
                <FormField
                  label="Código de rastreio"
                  htmlFor="pkg-tracking"
                  error={form.fieldError('tracking_code')}
                >
                  <Input
                    id="pkg-tracking"
                    value={form.values.tracking_code}
                    onChange={(e) => form.setField('tracking_code', e.target.value)}
                    placeholder="Ex.: PAC123456789BR"
                  />
                </FormField>
              </div>

              <FormField label="Observações" htmlFor="pkg-notes" error={form.fieldError('notes')}>
                <Textarea
                  id="pkg-notes"
                  value={form.values.notes}
                  onChange={(e) => form.setField('notes', e.target.value)}
                  placeholder="Informações adicionais (opcional)"
                  rows={3}
                />
              </FormField>

              <FormField label="Foto da etiqueta">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(0,0%,25%)] bg-[hsl(0,0%,15%)] px-4 py-6 text-sm text-[hsl(0,0%,60%)] transition-colors hover:border-[hsl(4,84%,56%)]/50 hover:text-[hsl(0,0%,93%)]">
                  <FileImage className="h-5 w-5" />
                  {photo ? photo.name : 'Anexar foto da etiqueta (opcional, máx. 8MB)'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f && f.size > 8 * 1024 * 1024) {
                      toast.error('Arquivo muito grande. Máximo: 8MB.')
                      return
                    }
                    setPhoto(f ?? null)
                  }}
                  />
                </label>
              </FormField>

              <div className="flex justify-end">
                <Button onClick={() => void submit()} disabled={saving || !condominium || condoLoading} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4" />
                      Confirmar recebimento
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
