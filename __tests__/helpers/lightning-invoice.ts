import { encode, sign } from "bolt11"

// Test-only key; these invoices never reach a payment network.
export const makeInvoice = (millisatoshis?: string): string =>
  sign(
    encode({
      millisatoshis,
      timestamp: 1700000000,
      tags: [
        { tagName: "payment_hash", data: "11".repeat(32) },
        { tagName: "description", data: "LNURL amount regression test" },
      ],
    }),
    "22".repeat(32),
  ).paymentRequest
