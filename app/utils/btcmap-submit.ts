// Native client for BTC Map's submission endpoints.
//
// BTC Map has no documented public write API. Its website forms (add-location,
// verify-location) POST to an internal SvelteKit route, `/api/gitea/issue`,
// which server-side files a Gitea issue for the volunteer "Shadowy Supertaggers"
// to action. That endpoint is reachable cross-origin and requires no secret of
// ours — but it is gated by a server-side SVG captcha (validated with BTC Map's
// own crypto keys) plus a honeypot field. We reproduce the web flow natively:
//   1. GET /captcha  -> { captcha: <svg>, captchaSecret: <opaque hex> }
//   2. user solves the 7-char SVG
//   3. POST /api/gitea/issue with the opaque secret + the user's answer.
//
// This depends on an UNDOCUMENTED endpoint. If BTC Map changes its contract or
// adds an origin check, these submissions break — coordinate with the BTC Map
// team (Matrix #btcmap:matrix.org) before relying on this in production.

import { BtcMapPlace } from "../types/btcmap"

const BASE = "https://btcmap.org"

export type Captcha = { svg: string; secret: string }

/** Fetch a fresh captcha challenge. The `secret` is opaque — pass it back verbatim. */
export async function fetchCaptcha(): Promise<Captcha> {
  const res = await fetch(`${BASE}/captcha`)
  if (!res.ok) throw new Error(`captcha ${res.status}`)
  const data = await res.json()
  return { svg: data.captcha as string, secret: data.captchaSecret as string }
}

export type IssueType = "add-location" | "verify-location"

/** Thrown when the server rejects the captcha answer specifically (vs a generic failure). */
export class CaptchaError extends Error {}

async function submit(type: IssueType, fields: Record<string, string>): Promise<number> {
  const res = await fetch(`${BASE}/api/gitea/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type, honey: "", ...fields }),
  })
  const data = (await res.json().catch(() => ({}))) as { number?: number; message?: string }
  if (!res.ok) {
    const msg = data?.message || `Submission failed (${res.status})`
    if (msg.toLowerCase().includes("captcha")) throw new CaptchaError(msg)
    throw new Error(msg)
  }
  return data.number as number
}

export type PaymentTag = "lightning" | "onchain" | "nfc"

export type AddLocationInput = {
  captchaSecret: string
  captchaTest: string
  name: string
  address?: string
  lat?: number
  long?: number
  category?: string
  methods?: PaymentTag[]
  website?: string
  phone?: string
  hours?: string
  notes?: string
  contact?: string
}

/** Submit a new merchant to BTC Map. Returns the created Gitea issue number. */
export function submitAddLocation(i: AddLocationInput): Promise<number> {
  const hasCoords = typeof i.lat === "number" && typeof i.long === "number"
  return submit("add-location", {
    captchaSecret: i.captchaSecret,
    captchaTest: i.captchaTest,
    name: i.name,
    address: i.address ?? "",
    lat: hasCoords ? String(i.lat) : "",
    long: hasCoords ? String(i.long) : "",
    osm: hasCoords ? `https://www.openstreetmap.org/edit#map=21/${i.lat}/${i.long}` : "",
    category: i.category ?? "",
    methods: (i.methods ?? []).join(","),
    website: i.website ?? "",
    phone: i.phone ?? "",
    hours: i.hours ?? "",
    notes: i.notes ?? "",
    source: "Bitcoin Jungle app",
    sourceOther: "",
    contact: i.contact ?? "",
  })
}

// Server-derived fields the verify form needs, reconstructed from a place we
// already hold. Mirrors btcmap.org's verify-location +page.server.ts.
export function verifyFieldsFromPlace(p: BtcMapPlace) {
  let osmType = "node"
  let osmId = String(p.osm_id ?? "")
  if (p.osm_id && p.osm_id.includes(":")) {
    const [t, id] = p.osm_id.split(":")
    osmType = t
    osmId = id
  }
  return {
    name: p.name ?? "",
    location: `https://btcmap.org/map#18/${p.lat}/${p.lon}`,
    edit: `https://www.openstreetmap.org/edit?${osmType}=${osmId}`,
    merchantId: String(p.id),
    lat: typeof p.lat === "number" ? String(p.lat) : "",
    long: typeof p.lon === "number" ? String(p.lon) : "",
  }
}

export type VerifyLocationInput = {
  captchaSecret: string
  captchaTest: string
  place: BtcMapPlace
  /** true = "still accepts bitcoin" (refresh verified_at); false = outdated/report-a-problem. */
  current: boolean
  /** Details of what's outdated; used when current=false. */
  outdated?: string
}

/** Verify (current=true) or report-outdated (current=false) an existing merchant. */
export function submitVerifyLocation(i: VerifyLocationInput): Promise<number> {
  const f = verifyFieldsFromPlace(i.place)
  return submit("verify-location", {
    captchaSecret: i.captchaSecret,
    captchaTest: i.captchaTest,
    name: f.name,
    location: f.location,
    edit: f.edit,
    current: i.current ? "Yes" : "No",
    outdated: i.outdated ?? "",
    verified: "",
    merchantId: f.merchantId,
    lat: f.lat,
    long: f.long,
  })
}
