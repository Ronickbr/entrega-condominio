// Cliente HTTP da Evolution API + retry com backoff.
// Funções de backoff são puras — testáveis com Node.

export interface EvolutionConfig {
  apiUrl: string
  apiKey: string
  instance: string
}

export interface SendTextResult {
  ok: boolean
  providerMessageId?: string
  error?: string
}

/** Delay (s) por tentativa: 0s / 60s / 300s — 3 tentativas máx. */
export function backoffDelaySeconds(attempt: number): number {
  const delays = [0, 60, 300]
  return delays[Math.min(Math.max(attempt, 0), delays.length - 1)]
}

/** Dispara texto via Evolution API (message/sendText). */
export async function sendText(
  config: EvolutionConfig,
  phone: string,
  message: string,
): Promise<SendTextResult> {
  try {
    const normalized = phone.replace(/\D/g, '')
    const url = `${config.apiUrl.replace(/\/$/, '')}/message/sendText/${config.instance}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.apiKey,
      },
      body: JSON.stringify({
        number: normalized,
        text: message,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return { ok: false, error: `Evolution falhou (${res.status}): ${detail.slice(0, 200)}` }
    }

    const body = (await res.json()) as { key?: { id?: string }; message?: unknown }
    return {
      ok: true,
      providerMessageId: body.key?.id ?? null,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de rede' }
  }
}

/** Atalho usado pelo webhook: normaliza telefone para chave de busca. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
