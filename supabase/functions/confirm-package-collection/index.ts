// Etapa 7/8 — Confirmação de retirada (defesa em profundidade).
// Autentica o usuário, captura IP/user-agent para auditoria e delega à RPC
// confirm_package_collection (UPDATE atômico + evento + notificação + audit).
// Para THIRD_PARTY, faz upload da foto terceiro para o bucket third-party-photos
// (primeiro path segment = condominium_id) antes de chamar a RPC.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { staticCorsHeaders } from '../_shared/response.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

export interface CollectionResult {
  success: boolean
  message: string
  final_status: string | null
  event_id: string | null
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: staticCorsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  const apikey = req.headers.get('apikey')
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
  const userAgent = req.headers.get('user-agent')

  if (!authHeader) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401, headers: staticCorsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader, apikey: apikey ?? supabaseAnonKey } },
  })

  let body: {
    p_package_id?: string
    p_collection_type?: 'RESIDENT' | 'THIRD_PARTY'
    p_third_party_auth_id?: string | null
    p_photo_data_url?: string | null
    p_authorized_name?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400, headers: staticCorsHeaders })
  }

  if (!body.p_package_id) {
    return Response.json({ error: 'p_package_id é obrigatório.' }, { status: 400, headers: staticCorsHeaders })
  }

  const collectionType = body.p_collection_type === 'THIRD_PARTY' ? 'THIRD_PARTY' : 'RESIDENT'

  // Upload foto do terceiro (data URL → bucket third-party-photos).
  // SSRF prevention: only allow data: URLs (base64-encoded raster images from the client).
  let photoStoragePath: string | null = null
  if (collectionType === 'THIRD_PARTY' && body.p_photo_data_url) {
    const dataUrl: string = body.p_photo_data_url
    // Extract MIME type and validate — block SVG (XSS risk), GIF, BMP, and non-image types
    const mimeMatch = dataUrl.match(/^data:(image\/[a-z+]+)/)
    const mime = mimeMatch?.[1] ?? ''
    const BLOCKED_MIMES = ['image/svg+xml', 'image/gif', 'image/bmp']
    if (!mime || BLOCKED_MIMES.includes(mime)) {
      // Skip upload — unsupported or potentially dangerous MIME type
    } else {
      try {
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        // Reject payloads larger than 8 MB
        if (blob.size > 8 * 1024 * 1024) {
          // Skip — too large
        } else {
          const ext = blob.type.includes('png') ? 'png' : 'jpeg'
          // Resolver condominium_id do pacote (para o path do storage).
          const { data: pkg } = await supabase
            .from('packages')
            .select('condominium_id')
            .eq('id', body.p_package_id)
            .maybeSingle()
          const condoId = (pkg as { condominium_id?: string } | null)?.condominium_id ?? 'unknown'
          const name = `${condoId}/${crypto.randomUUID()}.${ext}`
          const { error: uploadErr } = await supabase.storage
            .from('third-party-photos')
            .upload(name, blob, { contentType: 'image/jpeg' })
          if (!uploadErr) {
            photoStoragePath = `third-party-photos/${name}`
          }
        }
      } catch {
        // Falha no upload não impede a confirmação — path fica null.
      }
    }
  }

  const { data, error } = await supabase.rpc('confirm_package_collection', {
    p_package_id: body.p_package_id,
    p_collection_type: collectionType,
    p_third_party_auth_id: body.p_third_party_auth_id ?? null,
    p_ip: ip,
    p_user_agent: userAgent,
    p_photo_storage_path: photoStoragePath,
    p_authorized_name: body.p_authorized_name ?? null,
  })

  if (error) {
    const permission = /permiss[ãa]o/i.test(error.message)
    return Response.json(
      {
        success: false,
        message: permission
          ? 'Você não tem permissão para confirmar entregas.'
          : error.message,
      },
      { status: permission ? 403 : 400, headers: staticCorsHeaders },
    )
  }

  const rows = (data ?? []) as CollectionResult[]
  const result = rows[0]
  return Response.json(
    result ?? { success: false, message: 'Resposta inesperada.' },
    { status: result?.success ? 200 : 409, headers: staticCorsHeaders },
  )
}

Deno.serve(handler)