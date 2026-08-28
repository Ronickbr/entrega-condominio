import { memo, useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Barra de aviso de conectividade. Escuta navigator.onLine e exibe
 * um aviso no topo quando o dispositivo fica offline.
 */
export const OfflineState = memo(function OfflineState() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    function onOnline() {
      setOffline(false)
    }
    function onOffline() {
      setOffline(true)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline) return null
  return (
    <div className="flex items-center justify-center gap-2 bg-[hsl(38,90%,42%)] px-4 py-2 text-sm font-medium text-[hsl(0,0%,9%)]">
      <WifiOff className="h-4 w-4" />
      Internet instável. Tente novamente em instantes.
    </div>
  )
})
