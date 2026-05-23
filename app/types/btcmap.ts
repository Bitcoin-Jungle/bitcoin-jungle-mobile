// BTC Map /v4/places response shape.
// See https://github.com/teambtcmap/btcmap-api/blob/master/docs/rest/v4/places.md
// All fields are optional except `id` because the server returns only the
// fields you request via the `fields=` query param.

export type BtcMapPlace = {
  id: number
  osm_id?: string
  lat?: number
  lon?: number
  name?: string
  icon?: string
  address?: string
  description?: string
  opening_hours?: string
  phone?: string
  website?: string
  email?: string
  twitter?: string
  facebook?: string
  instagram?: string
  line?: string
  telegram?: string
  payment_provider?: string
  required_app_url?: string
  boosted_until?: string
  verified_at?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  comments?: number
  image?: string
} & {
  // OSM tags surfaced via the `osm:<tag>` prefix. Common ones we care about:
  // osm:payment:lightning, osm:payment:onchain, osm:payment:lightning_contactless,
  // osm:amenity, osm:shop, osm:tourism, osm:healthcare, osm:cuisine, osm:currency:XBT
  [key: `osm:${string}`]: string | undefined
}

export type MerchantCategory =
  | "restaurant"
  | "cafe"
  | "hotel"
  | "retail"
  | "health"
  | "tourism"
  | "services"
  | "transport"
  | "other"

export type PaymentMethod = "lightning" | "onchain" | "nfc"
