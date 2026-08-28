import type { ReminderTemplateInput } from './reminder.ts'
import { reminderTemplate } from './reminder.ts'

/** Lembrete de 72h. */
export function reminder72hTemplate(input: ReminderTemplateInput): string {
  return reminderTemplate({ ...input, thresholdHours: 72 })
}
