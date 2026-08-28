// Provider mock para desenvolvimento local (sem credenciais Google).
// Simula a leitura de uma etiqueta real de encomenda.
import type { OcrProvider } from '../types.ts'

const SAMPLE_LABEL = [
  'Correios',
  'Encomenda Expressa',
  'ANA SOUZA',
  'Bloco A - Apto 101',
  'CPF 175.381.083-35',
  'Tel (11) 90000-0005',
  '',
  'Rastreio: PJ123456789BR',
].join('\n')

export function createMockProvider(): OcrProvider {
  return {
    name: 'mock',
    async extractText() {
      return {
        text: SAMPLE_LABEL,
        wordConfidence: 0.95,
        raw: { provider: 'mock', sample: true },
      }
    },
  }
}