const isDev = import.meta.env.DEV

/**
 * Logger centralizado. Em produção, um futuro Sentry pode ser plugado aqui.
 * Stack trace NUNCA vai para o usuário.
 */
export function logError(err: unknown, context?: string): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.error(context ? `[${context}]` : '[error]', err)
  }
}

export function logWarn(message: string, context?: string): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(context ? `[${context}]` : '[warn]', message)
  }
}