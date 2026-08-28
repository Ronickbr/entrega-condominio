import type { ReminderTemplateInput } from './reminder.ts'
import { reminderTemplate } from './reminder.ts'

/** Lembrete de 48h. */
export function reminder48hTemplate(input: ReminderTemplateInput): string {
  return reminderTemplate({ ...input, thresholdHours: 48 })
}
