import { z } from 'zod'

export const unitFormSchema = z.object({
  number: z.string().trim().min(1, 'Informe o número da unidade'),
  floor: z.string().trim().max(10, 'Máximo 10 caracteres'),
  building_id: z.string().min(1, 'Selecione o bloco').nullable(),
})

export type UnitFormValues = z.infer<typeof unitFormSchema>

export const emptyUnitForm: UnitFormValues = {
  number: '',
  floor: '',
  building_id: null,
}