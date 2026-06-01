import { useCallback, useEffect, useRef, useState } from "react"
import { load, save } from "../../utils/storage"
import { BtcMapPlace, PlacePin } from "../../types/btcmap"
import { fetchPlaces, fetchSnapshot, inCostaRica } from "../../utils/btcmap"

const CACHE_KEY = "bj.btcmap.places.v3"

type Cache = {
  places: Record<number, BtcMapPlace>
  // Sync anchor: the max `updated_at` we've received. We resume `updated_since`
  // from this — NOT the device clock, which can skew and silently drop updates.
  cursor: string | null
  // Wall-clock time of the last successful sync, for the "Updated X ago" label.
  syncedAt: string | null
}

const snapshotInCr = (p: PlacePin): boolean =>
  typeof p.lat === "number" &&
  typeof p.lon === "number" &&
  p.lat >= 8.04 &&
  p.lat <= 11.22 &&
  p.lon >= -85.95 &&
  p.lon <= -82.55

// Largest ISO-8601 `updated_at` across places (lexicographic works for `...Z`).
const maxUpdatedAt = (places: BtcMapPlace[], floor: string | null): string | null => {
  let max = floor
  for (const p of places) {
    if (p.updated_at && (!max || p.updated_at > max)) max = p.updated_at
  }
  return max
}

const useBtcMapPlaces = () => {
  const [places, setPlaces] = useState<BtcMapPlace[]>([])
  // Lightweight pins for an instant cold-start map paint, before full fields load.
  const [pins, setPins] = useState<PlacePin[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const mounted = useRef(true)

  const refetch = useCallback(async () => {
    if (mounted.current) setLoading(true)
    try {
      // Load cache first for instant render on a warm start.
      const cached = (await load(CACHE_KEY)) as unknown as Cache | null
      const cacheMap: Record<number, BtcMapPlace> = cached?.places ?? {}
      const cursor = cached?.cursor ?? null
      const hasCache = !!cached && Object.keys(cacheMap).length > 0

      if (hasCache && mounted.current) {
        setPlaces(Object.values(cacheMap).filter(inCostaRica))
        setLastSync(cached?.syncedAt ?? null)
      } else {
        // Cold start: paint pins from the CDN snapshot (~1s) while the full
        // fields download in the background.
        try {
          const snap = await fetchSnapshot()
          if (mounted.current) setPins(snap.filter(snapshotInCr))
        } catch {
          // Snapshot is best-effort; the full sync below still populates the map.
        }
      }

      // Full incremental sync. Only cache CR places — global responses are large
      // enough to OOM AsyncStorage's FileReader path on Android.
      const fresh = await fetchPlaces(cursor ?? undefined)
      const merged: Record<number, BtcMapPlace> = { ...cacheMap }
      for (const p of fresh) {
        if (p.deleted_at) {
          delete merged[p.id]
        } else if (inCostaRica(p)) {
          merged[p.id] = p
        }
      }
      const newCursor = maxUpdatedAt(fresh, cursor)
      const syncedAt = new Date().toISOString()
      await save(CACHE_KEY, {
        places: merged,
        cursor: newCursor,
        syncedAt,
      } satisfies Cache)

      if (mounted.current) {
        setPlaces(Object.values(merged).filter(inCostaRica))
        setPins([]) // full data is now authoritative; drop the snapshot pins
        setLastSync(syncedAt)
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

  return { places, pins, loading, lastSync, error, refetch }
}

export default useBtcMapPlaces
