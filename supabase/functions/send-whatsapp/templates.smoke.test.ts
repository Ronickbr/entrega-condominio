// Smoke test dos templates WhatsApp + backoff (Etapa 6).
// Roda com: node --test
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  collectionTemplate,
  packageReceivedTemplate,
  reminder24hTemplate,
  reminder48hTemplate,
  reminder72hTemplate,
} from './templates/index.ts'
import { backoffDelaySeconds } from './services/whatsapp.service.ts'

test('templates: recebimento, retirada e lembretes 24/48/72h', () => {
  assert.ok(packageReceivedTemplate('ENC-001', 'A 101').includes('ENC-001'))
  assert.ok(packageReceivedTemplate('ENC-001', 'A 101').includes('A 101'))
  assert.ok(collectionTemplate('ENC-002').includes('ENC-002'))
  assert.ok(reminder24hTemplate({ internalCode: 'ENC-001', thresholdHours: 24 }).includes('24'))
  assert.ok(reminder48hTemplate({ internalCode: 'ENC-001', thresholdHours: 48 }).includes('48'))
  assert.ok(reminder72hTemplate({ internalCode: 'ENC-001', thresholdHours: 72 }).includes('72'))
  assert.ok(!reminder24hTemplate({ internalCode: 'ENC-001', thresholdHours: 24 }).includes('48'))
})

test('backoff: 0s / 60s / 300s, máximo 3 tentativas', () => {
  assert.equal(backoffDelaySeconds(0), 0)
  assert.equal(backoffDelaySeconds(1), 60)
  assert.equal(backoffDelaySeconds(2), 300)
  assert.equal(backoffDelaySeconds(3), 300)
})