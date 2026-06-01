// Client for Bitcoin Jungle's merchant-submission backend. Submissions go into
// BJ's moderation queue (an admin approves via an emailed magic link); approved
// items are pushed to BTC Map server-side via the Import RPC under
// origin=bitcoin-jungle. No captcha — the backend is the trust boundary, and it
// holds the import token (never the app).
//
// A successful response means "submitted for review", NOT live on the map.
// verify/report only update BTC Map for BJ-owned places; for others the backend
// degrades to an admin notification. Word the UI accordingly.

import { MerchantCategory } from "../types/btcmap"

const BASE = __DEV__ ? "http://10.0.2.2:8080" : "https://maps.bitcoinjungle.app"

async function post(path: string, body: object): Promise<number> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean
    id?: number
    error?: string
  }
  if (!res.ok || data.error) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data.id as number
}

export type AddPlaceInput = {
  name: string
  coordinates: { latitude: number; longitude: number }
  categories: MerchantCategory[]
  phone?: string
  website?: string
  description?: string
}

/** Submit a new merchant to BJ's review queue. Returns the queue row id. */
export function submitPlace(i: AddPlaceInput): Promise<number> {
  return post("/api/submit", {
    name: i.name,
    coordinates: i.coordinates,
    categories: i.categories,
    phone: i.phone || undefined,
    website: i.website || undefined,
    description: i.description || undefined,
  })
}

/**
 * Verify an existing place. `current=true` = still accepts bitcoin;
 * `current=false` (+ optional `outdated` details) = info is wrong.
 */
export function verifyPlace(
  targetPlaceId: number,
  current: boolean,
  outdated?: string,
): Promise<number> {
  return post("/api/verify", {
    target_place_id: targetPlaceId,
    current,
    outdated: outdated || undefined,
  })
}

/** Report a problem with an existing place (free-form description). */
export function reportPlace(targetPlaceId: number, description: string): Promise<number> {
  return post("/api/report", {
    target_place_id: targetPlaceId,
    description,
  })
}
