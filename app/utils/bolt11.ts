import * as lightningPayReq from "bolt11"

export const invoiceMatchesAmount = (invoice: unknown, amountMsat: number): boolean => {
  if (
    typeof invoice !== "string" ||
    !Number.isSafeInteger(amountMsat) ||
    amountMsat <= 0
  ) {
    return false
  }

  try {
    // Compare the exact millisatoshi string; rounding to sats could hide a mismatch.
    return lightningPayReq.decode(invoice).millisatoshis === amountMsat.toString()
  } catch {
    return false
  }
}

// helper for bolt11

// export const getHashFromInvoice = (request) => {
//   return parsePaymentRequest({request}).id
// }

// export const getDescription = (request): number | undefined => {
//   return parsePaymentRequest({request}).description
// }

// export const getAmount = (request): number | undefined => {
//   return parsePaymentRequest({request}).tokens
// }

export const getUsername = (
  decoded: lightningPayReq.PaymentRequestObject,
): lightningPayReq.TagData =>
  decoded.tags.find((value) => value.tagName === "username")?.data

export const getDescription = (
  decoded: lightningPayReq.PaymentRequestObject,
): lightningPayReq.TagData =>
  decoded.tags.find((value) => value.tagName === "description")?.data

export const getDestination = (decoded: lightningPayReq.PaymentRequestObject): string =>
  decoded.payeeNodeKey

export const getHashFromInvoice = (invoice: string): lightningPayReq.TagData => {
  const decoded = lightningPayReq.decode(invoice)
  return decoded.tags.find((value) => value.tagName === "payment_hash")?.data
}
