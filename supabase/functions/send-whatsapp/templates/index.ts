import type { ReminderTemplateInput } from './reminder.ts'
import { reminderTemplate } from './reminder.ts'

/** Recebimento de encomenda. */
export function packageReceivedTemplate(
  internalCode: string,
  unitLabel?: string | null,
): string {
  const unit = unitLabel ? ` (${unitLabel})` : ''
  return `Sua encomenda ${internalCode} chegou e está aguardando retirada na portaria${unit}.`
}

/** Retirada confirmada. */
export function collectionTemplate(internalCode: string): string {
  return `Sua encomenda ${internalCode} foi retirada na portaria.`
}

export type { ReminderTemplateInput }
export { reminderTemplate }
export { reminder24hTemplate } from './reminder-24h.ts'
export { reminder48hTemplate } from './reminder-48h.ts'
export { reminder72hTemplate } from './reminder-72h.ts'
