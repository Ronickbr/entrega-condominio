import { z } from 'zod'
import { StaffPosition } from '@/types/cadastros'

export const staffFormSchema = z.object({
  profile_id: z.string().min(1, 'Selecione o perfil'),
  position: z.enum(
    [
      StaffPosition.SYNDIC,
      StaffPosition.DOORMAN,
      StaffPosition.RECEPTIONIST,
      StaffPosition.MANAGER,
    ],
    { message: 'Selecione o cargo' },
  ),
})

export type StaffFormValues = z.infer<typeof staffFormSchema>

export const emptyStaffForm: StaffFormValues = {
  profile_id: '',
  position: StaffPosition.DOORMAN,
}