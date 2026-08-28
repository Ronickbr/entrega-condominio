import { z } from 'zod'
import { isValidCNPJ, isValidEmail, onlyDigits } from '@/lib/utils'

export const condominiumAddressSchema = z.object({
  street: z.string().trim().max(120, 'Máximo 120 caracteres'),
  number: z.string().trim().max(20, 'Máximo 20 caracteres'),
  complement: z.string().trim().max(120, 'Máximo 120 caracteres'),
  neighborhood: z.string().trim().max(120, 'Máximo 120 caracteres'),
  city: z.string().trim().max(80, 'Máximo 80 caracteres'),
  state: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Za-z]{2}$/.test(v), 'Use a sigla do estado (ex.: SP)'),
  zipcode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{5}-?\d{3}$/.test(onlyDigits(v) ? v : ''), 'CEP inválido'),
})

export const condominiumFormSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome do condomínio'),
  cnpj: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidCNPJ(v), 'CNPJ inválido'),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || onlyDigits(v).length >= 10, 'Telefone inválido'),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidEmail(v), 'E-mail inválido'),
  syndic_name: z.string().trim().max(120, 'Máximo 120 caracteres'),
  admin_phone: z
    .string()
    .trim()
    .refine((v) => v === '' || onlyDigits(v).length >= 10, 'Telefone inválido'),
  address: condominiumAddressSchema,
})

export type CondominiumFormValues = z.infer<typeof condominiumFormSchema>

export const emptyCondominiumForm: CondominiumFormValues = {
  name: '',
  cnpj: '',
  phone: '',
  email: '',
  syndic_name: '',
  admin_phone: '',
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
  },
}