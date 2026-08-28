import type { ReminderTemplateInput } from './reminder.ts'
import { reminderTemplate } from './reminder.ts'

/** Lembrete de 24h. */
export function reminder24hTemplate(input: ReminderTemplateInput): string {
  return reminderTemplate({ ...input, thresholdHours: 24 })
}
