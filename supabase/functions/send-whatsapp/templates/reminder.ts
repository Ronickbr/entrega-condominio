// Template base de lembrete (compartilhado pelos thresholds).
export interface ReminderTemplateInput {
  internalCode: string
  thresholdHours: number
}

export function reminderTemplate({ internalCode, thresholdHours }: ReminderTemplateInput): string {
  return `Lembrete: sua encomenda ${internalCode} aguarda retirada na portaria há mais de ${thresholdHours} horas.`
}
