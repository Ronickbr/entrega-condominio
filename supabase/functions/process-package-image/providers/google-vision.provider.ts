// Provider real: Google Cloud Vision API (TEXT_DETECTION).
// Usa credenciais de service account (GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64).
import type { OcrProvider } from '../types.ts'

function base64Encode(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function createGoogleVisionProvider(): OcrProvider {
  const credentialsBase64 = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64') ?? ''
  const project = Deno.env.get('GOOGLE_CLOUD_PROJECT') ?? ''

  async function getAccessToken(): Promise<string> {
    const credentials = JSON.parse(atob(credentialsBase64))
    const { GoogleAuth } = await import('npm:google-auth-library@^9')
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-vision'],
    })
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    return token ?? ''
  }

  return {
    name: 'google_vision',
    async extractText(imageBytes: Uint8Array) {
      const accessToken = await getAccessToken()
      const endpoint = `https://vision.googleapis.com/v1/projects/${project}/locations/global/images:annotate`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Encode(imageBytes) },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
      })

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Google Vision falhou (${res.status}): ${detail.slice(0, 300)}`)
      }

      const body = await res.json()
      const annotation = body.responses?.[0]?.textAnnotations?.[0]
      const text = annotation?.description ?? ''
      const wordConfidence = annotation?.confidence ?? undefined
      return { text, wordConfidence, raw: body }
    },
  }
}