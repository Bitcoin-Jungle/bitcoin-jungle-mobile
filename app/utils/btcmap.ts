import { BtcMapPlace, MerchantCategory, PaymentMethod } from "../types/btcmap"

const BASE = "https://api.btcmap.org/v4"

const PLACE_FIELDS = [
  "id",
  "osm_id",
  "lat",
  "lon",
  "name",
  "icon",
  "address",
  "description",
  "opening_hours",
  "phone",
  "website",
  "email",
  "twitter",
  "facebook",
  "instagram",
  "telegram",
  "verified_at",
  "created_at",
  "updated_at",
  "deleted_at",
  "image",
  "osm:amenity",
  "osm:shop",
  "osm:tourism",
  "osm:healthcare",
  "osm:office",
  "osm:sport",
  "osm:cuisine",
  "osm:payment:lightning",
  "osm:payment:onchain",
  "osm:payment:lightning_contactless",
  "osm:description:en",
  "osm:description:es",
  "osm:name:en",
  "osm:name:es",
  "osm:currency:XBT",
].join(",")

export async function fetchPlaces(updatedSince?: string): Promise<BtcMapPlace[]> {
  const params = new URLSearchParams({ fields: PLACE_FIELDS })
  if (updatedSince) {
    params.set("updated_since", updatedSince)
    params.set("include_deleted", "true")
  }
  const res = await fetch(`${BASE}/places?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`BTC Map /v4/places returned ${res.status}`)
  }
  return res.json()
}

// Costa Rica bounding box (rough country-wide).
export const CR_BBOX = {
  north: 11.22,
  south: 8.04,
  east: -82.55,
  west: -85.95,
}

export function inCostaRica(p: BtcMapPlace): boolean {
  if (typeof p.lat !== "number" || typeof p.lon !== "number") return false
  return (
    p.lat >= CR_BBOX.south &&
    p.lat <= CR_BBOX.north &&
    p.lon >= CR_BBOX.west &&
    p.lon <= CR_BBOX.east
  )
}

// Map a BTC Map place to a logical category for filtering UI.
// Uses the explicit BTC Map `icon` first, falls back to OSM tags.
export function inferCategory(p: BtcMapPlace): MerchantCategory {
  const icon = p.icon?.toLowerCase()
  if (icon === "restaurant" || p["osm:amenity"] === "restaurant") return "restaurant"
  if (icon === "cafe" || p["osm:amenity"] === "cafe") return "cafe"
  if (icon === "hotel" || p["osm:tourism"] === "hotel") return "hotel"
  if (p["osm:tourism"]) return "tourism"
  if (p["osm:healthcare"]) return "health"
  if (p["osm:shop"]) return "retail"
  if (p["osm:office"]) return "services"
  if (p["osm:sport"]) return "tourism"
  return "other"
}

export function paymentMethods(p: BtcMapPlace): PaymentMethod[] {
  const out: PaymentMethod[] = []
  if (p["osm:payment:lightning"] === "yes") out.push("lightning")
  if (p["osm:payment:onchain"] === "yes") out.push("onchain")
  if (p["osm:payment:lightning_contactless"] === "yes") out.push("nfc")
  return out
}

// Pick the best-localized display string from a place. Prefers
// osm:<field>:<lang>, falls back to the top-level field, then to English.
export function localized(
  p: BtcMapPlace,
  field: "name" | "description",
  lang: string | undefined,
): string | undefined {
  const code = (lang || "en").slice(0, 2).toLowerCase()
  const localizedKey = `osm:${field}:${code}` as `osm:${string}`
  return (p[localizedKey] as string | undefined) || p[field] || p[`osm:${field}:en` as `osm:${string}`]
}

// Verification freshness from `verified_at`.
//  - "fresh": verified within the last 12 months
//  - "stale": verified between 12 and 24 months ago
//  - "unverified": verified >24 months ago, or never
export function verificationStatus(p: BtcMapPlace): "fresh" | "stale" | "unverified" {
  if (!p.verified_at) return "unverified"
  const verified = Date.parse(p.verified_at)
  if (isNaN(verified)) return "unverified"
  const ageMs = Date.now() - verified
  const months = ageMs / (1000 * 60 * 60 * 24 * 30.44)
  if (months < 12) return "fresh"
  if (months < 24) return "stale"
  return "unverified"
}

// Haversine distance in km. Cheap inline impl.
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Build a platform-appropriate directions URL.
export function directionsUrl(
  lat: number,
  lon: number,
  name: string | undefined,
  platform: "ios" | "android",
): string {
  if (platform === "ios") {
    return `maps://?daddr=${lat},${lon}`
  }
  const label = name ? `(${encodeURIComponent(name)})` : ""
  return `geo:0,0?q=${lat},${lon}${label}`
}
