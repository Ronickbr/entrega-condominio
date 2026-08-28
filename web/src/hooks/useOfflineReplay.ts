import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  listPackageDrafts,
  removePackageDraft,
  type PackageDraft,
} from '@/lib/offline'

interface UseOfflineReplayOptions {
  onReplay: (draft: PackageDraft) => Promise<void>
}

/**
 * Quando a conexão volta (evento 'online'), reenvia as encomendas
 * salvas localmente (idempotentes por idempotencyKey).
 */
export function useOfflineReplay({ onReplay }: UseOfflineReplayOptions) {
  useEffect(() => {
    let replaying = false

    async function replay() {
      if (replaying) return
      replaying = true
      const drafts = await listPackageDrafts()
      for (const draft of drafts) {
        try {
          await onReplay(draft)
          await removePackageDraft(draft.idempotencyKey)
        } catch {
          // mantém o rascunho para a próxima reconexão
        }
      }
      if (drafts.length > 0) {
        toast.success('Encomendas pendentes reenviadas.')
      }
      replaying = false
    }

    window.addEventListener('online', replay)
    return () => {
      window.removeEventListener('online', replay)
    }
  }, [onReplay])
}
