import { z } from 'zod'

export const residentFormSchema = z.object({
  profile_id: z.string().min(1, 'Selecione o perfil'),
  unit_id: z.string().min(1, 'Selecione a unidade'),
  is_primary: z.boolean().default(false),
  pin_code: z.string().regex(/^\d{4}$/, 'O PIN deve conter exatamente 4 dígitos numéricos').optional().or(z.literal('')),
})

export type ResidentFormValues = z.infer<typeof residentFormSchema>

export const emptyResidentForm: ResidentFormValues = {
  profile_id: '',
  unit_id: '',
  is_primary: false,
  pin_code: '',
}

export const pinChangeSchema = z.object({
  pin_code: z.string().regex(/^\d{4}$/, 'O PIN deve conter exatamente 4 dígitos numéricos'),
})

export type PinChangeValues = z.infer<typeof pinChangeSchema>