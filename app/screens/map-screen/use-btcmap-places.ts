import { useCallback, useEffect, useRef, useState } from "react"
import { load, save } from "../../utils/storage"
import { BtcMapPlace } from "../../types/btcmap"
import { fetchPlaces, inCostaRica } from "../../utils/btcmap"

const CACHE_KEY = "bj.btcmap.places.v2"

type Cache = {
  places: Record<number, BtcMapPlace>
  lastSync: string | null
}

const useBtcMapPlaces = () => {
  const [places, setPlaces] = useState<BtcMapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const mounted = useRef(true)

  const refetch = useCallback(async () => {
    if (mounted.current) setLoading(true)
    try {
      // Always load cache first for instant render.
      const cached = (await load(CACHE_KEY)) as unknown as Cache | null
      const cacheMap: Record<number, BtcMapPlace> = cached?.places ?? {}
      const cachedLastSync = cached?.lastSync ?? null

      if (cached && mounted.current) {
        setPlaces(Object.values(cacheMap).filter(inCostaRica))
        setLastSync(cachedLastSync)
      }

      // Incremental sync from server. Only cache CR places — global responses
      // are large enough to OOM AsyncStorage's FileReader path on Android.
      const fresh = await fetchPlaces(cachedLastSync ?? undefined)
      const merged: Record<number, BtcMapPlace> = { ...cacheMap }
      for (const p of fresh) {
        if (p.deleted_at) {
          delete merged[p.id]
        } else if (inCostaRica(p)) {
          merged[p.id] = p
        }
      }
      const nowIso = new Date().toISOString()
      await save(CACHE_KEY, { places: merged, lastSync: nowIso } satisfies Cache)

      if (mounted.current) {
        setPlaces(Object.values(merged).filter(inCostaRica))
        setLastSync(nowIso)
        setError(null)
      }
    } catch (e) {
      if (mounted.current) setError(e as Error)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    refetch()
    return () => {
      mounted.current = false
    }
  }, [refetch])

  return { places, loading, lastSync, error, refetch }
}

export default useBtcMapPlaces
