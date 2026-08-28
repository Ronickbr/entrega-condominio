import { useState } from 'react'
import { z } from 'zod'

/**
 * Estado controlado de formulário com validação zod (v4).
 * Os erros são achatados em `fieldErrors` usando os nomes dos campos
 * (campos aninhados aparecem como "address.street").
 */
export function useFormState<TValues>(
  schema: z.ZodType<TValues>,
  initial: TValues,
) {
  const [values, setValues] = useState<TValues>(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function reset(next: TValues = initial) {
    setValues(next)
    setFieldErrors({})
  }

  function setField<K extends keyof TValues>(name: K, value: TValues[K]) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function parse(): TValues | null {
    const result = schema.safeParse(values)
    if (result.success) {
      setFieldErrors({})
      return result.data
    }
    const flat = z.flattenError(result.error)
    const merged: Record<string, string> = {}
    for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
      const first = Array.isArray(msgs) ? msgs[0] : undefined
      if (first) merged[key] = first
    }
    setFieldErrors(merged)
    return null
  }

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]
  }

  return { values, setField, setValues, reset, parse, fieldErrors, fieldError }
}