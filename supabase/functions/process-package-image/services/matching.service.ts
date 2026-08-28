// Matching automático: similaridade de nome (Jaro-Winkler) + score.
// Módulo puro (sem dependências Deno/Supabase) — testável com Node.
import type { CandidateResident, MatchResult, PackageExtractionResult } from '../types.ts'
import { normalizeText } from './extraction.service.ts'

/**
 * Jaro-Winkler (0 a 1). Prefixo de até 4 caracteres iguais recebe bônus.
 */
export function jaroWinkler(aRaw: string, bRaw: string): number {
  const a = aRaw.toLowerCase()
  const b = bRaw.toLowerCase()
  if (a === b) return 1
  const aLen = a.length
  const bLen = b.length
  if (aLen === 0 || bLen === 0) return 0

  const matchDistance = Math.max(aLen, bLen) / 2 - 1
  const aMatches = new Array<boolean>(aLen).fill(false)
  const bMatches = new Array<boolean>(bLen).fill(false)
  let matches = 0

  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, bLen)
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue
      aMatches[i] = true
      bMatches[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0

  let transpositions = 0
  let k = 0
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue
    while (!bMatches[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }

  const m = matches
  const jaro = (m / aLen + m / bLen + (m - transpositions / 2) / m) / 3

  let prefix = 0
  for (let i = 0; i < Math.min(4, aLen, bLen); i++) {
    if (a[i] === b[i]) prefix++
    else break
  }
  return jaro + prefix * 0.1 * (1 - jaro)
}

function lastNameOnly(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 2) return fullName.trim()
  // "Ana Souza" → "Ana Souza"; "Ana Beatriz Souza Lima" → "Souza Lima"
  return parts.slice(-2).join(' ')
}

function normalizePhone(value: string | null): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Score 0–100 de um candidato contra a extração. */
export function scoreCandidate(
  extraction: PackageExtractionResult,
  candidate: CandidateResident,
): MatchResult {
  let score = 0
  const reasons: string[] = []

  if (
    extraction.unit_number &&
    candidate.unit_number &&
    normalizeText(extraction.unit_number) === normalizeText(candidate.unit_number)
  ) {
    score += 60
    reasons.push(`unidade ${candidate.unit_number}`)
  }

  if (
    extraction.building_name &&
    candidate.building_name &&
    normalizeText(extraction.building_name) === normalizeText(candidate.building_name)
  ) {
    score += 15
    reasons.push(`bloco ${candidate.building_name}`)
  }

  if (extraction.recipient_name && candidate.full_name) {
    const sim = jaroWinkler(normalizeText(extraction.recipient_name), normalizeText(candidate.full_name))
    const simLast = jaroWinkler(
      normalizeText(extraction.recipient_name),
      normalizeText(lastNameOnly(candidate.full_name)),
    )
    const best = Math.max(sim, simLast)
    if (best > 0.85) {
      score += 20
      reasons.push(`nome ${candidate.full_name.split(' ')[0]}`)
    }
  }

  if (extraction.cpf && candidate.cpf) {
    const ext = extraction.cpf.replace(/\D/g, '')
    const cand = normalizePhone(candidate.cpf)
    if (ext === cand) {
      score += 15
      reasons.push('CPF completo')
    } else if (ext.length >= 4 && cand.endsWith(ext.slice(-4))) {
      score += 15
      reasons.push('CPF (parcial)')
    }
  }

  if (extraction.phone && candidate.phone) {
    const ext = normalizePhone(extraction.phone)
    const cand = normalizePhone(candidate.phone)
    if (ext === cand) {
      score += 5
      reasons.push('telefone')
    } else if (ext.length >= 4 && cand.endsWith(ext.slice(-4))) {
      score += 5
      reasons.push('telefone (parcial)')
    }
  }

  const unitLabel = candidate.unit_number
    ? candidate.building_name
      ? `${candidate.building_name} ${candidate.unit_number}`.trim()
      : candidate.unit_number
    : 'Sem unidade'

  return {
    resident_id: candidate.resident_id,
    full_name: candidate.full_name,
    unit_label: unitLabel,
    score,
    reasons,
  }
}

/** Ordena candidatos por score (top 5), decrescente. */
export function matchResidents(
  extraction: PackageExtractionResult,
  residents: CandidateResident[],
): MatchResult[] {
  return residents
    .map((c) => scoreCandidate(extraction, c))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}