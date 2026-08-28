import { z } from 'zod'

export const buildingFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do bloco'),
  identifier: z.string().trim().max(10, 'Máximo 10 caracteres'),
})

export type BuildingFormValues = z.infer<typeof buildingFormSchema>

export const emptyBuildingForm: BuildingFormValues = {
  name: '',
  identifier: '',
}