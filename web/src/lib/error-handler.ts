import type { PostgrestError } from '@supabase/supabase-js'

export interface SanitizedError {
  message: string
  code: string | null
  shouldRedirectToLogin: boolean
}

const GENERIC = 'Ops, ocorreu um erro. Tente novamente.'

/**
 * Converte qualquer erro (PostgrestError, rede, JWT, exceção de RPC)
 * em uma mensagem amigável. Nunca expõe stack ou códigos crus ao usuário.
 */
export function sanitizeError(err: unknown): SanitizedError {
  const maybePg = err as Partial<PostgrestError> | null
  const code = typeof maybePg?.code === 'string' ? (maybePg.code as string) : null
  const rawMessage =
    typeof (err as { message?: unknown } | null)?.message === 'string'
      ? ((err as { message: string }).message)
      : ''

  // Sessão expirada / JWT inválido
  if (
    code === 'PGRST301' ||
    /jwt expired/i.test(rawMessage) ||
    /invalid_jwt/i.test(rawMessage) ||
    /Auth session missing/i.test(rawMessage)
  ) {
    return {
      message: 'Sua sessão expirou. Entre novamente.',
      code,
      shouldRedirectToLogin: true,
    }
  }

  if (code === 'PGRST116' || code === '42501' || code === 'P0001') {
    return { message: 'Você não tem permissão para esta ação.', code, shouldRedirectToLogin: false }
  }
  if (code === '23505') {
    return { message: 'Registro já existe.', code, shouldRedirectToLogin: false }
  }
  if (code === '23503') {
    return { message: 'Registro relacionado não encontrado.', code, shouldRedirectToLogin: false }
  }
  if (code === '23514') {
    return { message: 'Valor inválido para um dos campos.', code, shouldRedirectToLogin: false }
  }
  if (code === '42P01') {
    return { message: 'Operação indisponível no momento.', code, shouldRedirectToLogin: false }
  }
  if (/network/i.test(rawMessage) || /fetch/i.test(rawMessage)) {
    return { message: 'Falha de conexão. Verifique sua internet.', code, shouldRedirectToLogin: false }
  }

  // Mensagem amigável vinda do backend (RPCs/triggers), se não for código cru.
  if (rawMessage && !code) {
    return { message: rawMessage, code, shouldRedirectToLogin: false }
  }

  return { message: GENERIC, code, shouldRedirectToLogin: false }
}

export function isAuthError(err: unknown): boolean {
  return sanitizeError(err).shouldRedirectToLogin
}