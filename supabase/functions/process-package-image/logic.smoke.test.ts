// Smoke test da lógica pura de extração + matching (roda com `node --test`).
// Critério da Etapa 5: extrair >=3 de 7 campos de uma foto de etiqueta e
// acusar o morador correto entre os top candidatos.
import test from 'node:test'
import assert from 'node:assert/strict'
import { extractFromText, normalizeText } from './services/extraction.service.ts'
import { jaroWinkler, matchResidents, scoreCandidate } from './services/matching.service.ts'

const LABEL = [
  'Correios',
  'Encomenda Expressa',
  'ANA SOUZA',
  'Bloco A - Apto 101',
  'CPF 175.381.083-35',
  'Tel (11) 90000-0005',
  'Rastreio: PJ123456789BR',
].join('\n')

const CANDIDATES = [
  { resident_id: 'r-ana', full_name: 'Ana Souza', unit_number: '101', building_name: 'A', cpf: '17538108335', phone: '11900000005' },
  { resident_id: 'r-bruno', full_name: 'Bruno Costa', unit_number: '102', building_name: 'A', cpf: '51234567890', phone: '11900000002' },
  { resident_id: 'r-carla', full_name: 'Carla Mendes', unit_number: '201', building_name: 'B', cpf: '09876543210', phone: '11900000003' },
  { resident_id: 'r-jose', full_name: 'Jose Ribeiro', unit_number: '15', building_name: null, cpf: null, phone: null },
]

test('extrai >=3 de 7 campos esperados da etiqueta', () => {
  const r = extractFromText(LABEL)
  const detected = [
    r.recipient_name,
    r.unit_number,
    r.building_name,
    r.cpf,
    r.phone,
    r.carrier,
    r.tracking_code,
  ].filter(Boolean)
  assert.ok(detected.length >= 3, `só detectou ${detected.length}: ${JSON.stringify(detected)}`)
  assert.equal(r.recipient_name, 'ANA SOUZA')
  assert.equal(r.unit_number, '101')
  assert.equal(r.building_name, 'A')
  assert.equal(r.cpf, '17538108335')
  assert.equal(r.carrier, 'Correios')
  assert.equal(r.tracking_code, 'PJ123456789BR')
  assert.ok(r.confidence.recipient_name >= 0.6, 'nome com confiança presente')
  assert.ok(r.raw_result.text === LABEL, 'raw_result sempre presente')
})

test('jaro-winkler: nomes iguais = 1, distintos = baixo', () => {
  assert.equal(jaroWinkler('ana souza', 'ana souza'), 1)
  assert.ok(jaroWinkler('ana souza', 'ana souza') > jaroWinkler('ana souza', 'bruno costa'))
})

test('matching: ana é o top candidato com score máximo', () => {
  const r = extractFromText(LABEL)
  const matches = matchResidents(r, CANDIDATES)
  assert.ok(matches.length >= 1, 'deve haver ao menos um candidato')
  assert.equal(matches[0].resident_id, 'r-ana')
  assert.ok(matches[0].score >= 100, `score ${matches[0].score} esperado >= 100`)
  assert.ok(matches[0].reasons.length >= 3, 'reasons devem explicar o match')
})

test('matching: jose (sem bloco) não é apontado como top', () => {
  const r = extractFromText(LABEL)
  const score = scoreCandidate(r, CANDIDATES[3])
  assert.ok(score.score < matchesAna(), 'jose não deve superar ana')
  function matchesAna() {
    return scoreCandidate(r, CANDIDATES[0]).score
  }
})

test('normalizeText remove acentos e espaços extras', () => {
  assert.equal(normalizeText('  Bloco   A - Apto 101  '), 'bloco a apto 101')
})
