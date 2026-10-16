import { invoiceMatchesAmount } from "@app/utils/bolt11"
import { makeInvoice } from "../helpers/lightning-invoice"

describe("invoiceMatchesAmount", () => {
  it("accepts the exact requested millisatoshi amount", () => {
    expect(invoiceMatchesAmount(makeInvoice("151000"), 151000)).toBe(true)
    expect(invoiceMatchesAmount(makeInvoice("151001"), 151001)).toBe(true)
    expect(invoiceMatchesAmount(makeInvoice("151000").toUpperCase(), 151000)).toBe(true)
  })

  it.each(["2461000", "150000", "151001", "150999"])(
    "rejects a returned invoice for %s msat when 151000 were requested",
    (amount) => {
      expect(invoiceMatchesAmount(makeInvoice(amount), 151000)).toBe(false)
    },
  )

  it.each([undefined, null, 151000, {}, "", "not an invoice", makeInvoice()])(
    "rejects malformed or amountless invoices: %p",
    (invoice) => {
      expect(invoiceMatchesAmount(invoice, 151000)).toBe(false)
    },
  )

  it("rejects a damaged checksum", () => {
    const invoice = makeInvoice("151000")
    expect(invoiceMatchesAmount(invoice.slice(0, -1) + "!", 151000)).toBe(false)
  })

  it.each([0, -1, NaN, Infinity, 151000.1, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid requested amounts: %p",
    (amount) => {
      expect(invoiceMatchesAmount(makeInvoice("151000"), amount)).toBe(false)
    },
  )
})
