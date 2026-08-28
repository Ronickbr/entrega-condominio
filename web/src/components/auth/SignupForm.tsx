import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  getSignupBuildings,
  signUpResident,
  type SignupBuilding,
} from '@/features/residents/household.service'
import { onlyDigits } from '@/lib/utils'

const signupSchema = z
  .object({
    full_name: z.string().trim().min(3, 'Informe o nome completo'),
    email: z.string().trim().email('E-mail inválido'),
    password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
    confirm: z.string(),
    building_id: z.string().min(1, 'Selecione o bloco'),
    unit_number: z.string().trim().min(1, 'Informe o apartamento'),
    phone: z.string().trim().min(10, 'Informe um telefone válido com DDD'),
    accepts: z.boolean(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  })
  .refine((v) => v.accepts === true, {
    message: 'Confirme que você é morador deste apartamento',
    path: ['accepts'],
  })

type FieldError = Partial<Record<keyof z.infer<typeof signupSchema>, string>>

export function SignupForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const [buildings, setBuildings] = useState<SignupBuilding[]>([])
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
    building_id: '',
    unit_number: '',
    phone: '',
    accepts: false,
  })
  const [errors, setErrors] = useState<FieldError>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getSignupBuildings()
      .then(setBuildings)
      .catch(() => setBuildings([]))
  }, [])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    const parsed = signupSchema.safeParse(form)
    if (!parsed.success) {
      const errs: FieldError = {}
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof typeof form
        if (!errs[k]) errs[k] = issue.message
      }
      setErrors(errs)
      return
    }
    setErrors({})
    setSubmitting(true)
    const { error } = await signUpResident({
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      building_id: form.building_id,
      unit_number: form.unit_number,
      phone: onlyDigits(form.phone),
    })
    setSubmitting(false)
    if (error) {
      toast.error('Falha no cadastro', { description: error })
      return
    }
    toast.success('Cadastro realizado. Bem-vindo!')
    navigate('/minhas-encomendas', { replace: true })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastre-se como morador</CardTitle>
        <CardDescription>
          Crie seu acesso e vincule ao seu apartamento em poucos passos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="su-fullname">Nome completo</Label>
            <Input
              id="su-fullname"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="Seu nome completo"
              autoComplete="name"
            />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="su-email">E-mail</Label>
            <Input
              id="su-email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="su-password">Senha</Label>
              <Input
                id="su-password"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="su-confirm">Confirmar senha</Label>
              <Input
                id="su-confirm"
                type="password"
                value={form.confirm}
                onChange={(e) => set('confirm', e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="su-building">Bloco</Label>
              <Select
                id="su-building"
                value={form.building_id}
                onChange={(e) => set('building_id', e.target.value)}
              >
                <option value="">Selecione o bloco</option>
                {buildings.map((b) => (
                  <option key={b.building_id} value={b.building_id}>
                    {b.condominium_name} · {b.building_name}
                  </option>
                ))}
              </Select>
              {errors.building_id && <p className="text-xs text-destructive">{errors.building_id}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="su-unit">Apartamento</Label>
              <Input
                id="su-unit"
                value={form.unit_number}
                onChange={(e) => set('unit_number', e.target.value)}
                placeholder="Ex.: 101"
                inputMode="numeric"
              />
              {errors.unit_number && <p className="text-xs text-destructive">{errors.unit_number}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="su-phone">WhatsApp para recebimento das notificações</Label>
            <Input
              id="su-phone"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="(11) 90000-0000"
              inputMode="tel"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[hsl(4,84%,56%)]"
              checked={form.accepts}
              onChange={(e) => set('accepts', e.target.checked)}
            />
            <span>
              <span className="font-medium">Sou morador deste apartamento</span>
              {errors.accepts && <span className="block text-xs text-destructive">{errors.accepts}</span>}
            </span>
          </label>

          <Button type="submit" disabled={submitting || buildings.length === 0} data-primary-mobile="true">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando acesso...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Concluir cadastro
              </>
            )}
          </Button>

          <Button type="button" variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft className="h-4 w-4" />
            Já tenho conta — voltar para o login
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}