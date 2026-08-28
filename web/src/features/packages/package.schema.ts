import { z } from 'zod'

/**
 * Formulário de cadastro manual de encomenda.
 * O morador é opcional (caso NÃO_IDENTIFICADA), mas ao menos um dos
 * campos morador/recipiente precisa ser preenchido.
 */
export const packageFormSchema = z
  .object({
    resident_id: z.string().min(1).nullable(),
    recipient_name_raw: z.string().trim().max(200, 'Máximo 200 caracteres'),
    carrier: z.string().trim().max(100, 'Máximo 100 caracteres'),
    tracking_code: z.string().trim().max(60, 'Máximo 60 caracteres'),
    notes: z.string().trim().max(500, 'Máximo 500 caracteres'),
  })
  .superRefine((v, ctx) => {
    if (!v.resident_id && !v.recipient_name_raw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipient_name_raw'],
        message: 'Informe o morador ou um nome para a encomenda',
      })
    }
  })

export type PackageFormValues = z.infer<typeof packageFormSchema>

export const emptyPackageForm: PackageFormValues = {
  resident_id: null,
  recipient_name_raw: '',
  carrier: '',
  tracking_code: '',
  notes: '',
}