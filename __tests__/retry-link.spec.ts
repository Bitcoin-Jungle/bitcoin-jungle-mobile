import { ApolloLink, execute, gql, Observable } from "@apollo/client"
import { createRetryLink } from "../app/graphql/retry-link"

const run = (query, response) => {
  const request = jest.fn(() => new Observable(response))
  const result = new Promise((resolve, reject) => {
    execute(createRetryLink().concat(new ApolloLink(request)), { query }).subscribe({
      next: resolve,
      error: reject,
    })
  })
  return { request, result }
}

describe("network retries", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it.each([
    "lnInvoicePaymentSend",
    "lnNoAmountInvoicePaymentSend",
    "intraLedgerPaymentSend",
    "onChainPaymentSend",
    "renamedPayment",
    "",
  ])("sends mutation %s only once when its response is lost", async (name) => {
    const error = new Error("Connection closed after server accepted payment")
    const { request, result } = run(
      gql(`mutation ${name} { send { status } }`),
      (observer) => observer.error(error),
    )
    await expect(result).rejects.toBe(error)
    await jest.runAllTimersAsync()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("retries a read after a network error and returns its result", async () => {
    let attempts = 0
    const { request, result } = run(
      gql`
        query Balance {
          balance
        }
      `,
      (observer) => {
        if (++attempts === 1) observer.error(new Error("offline"))
        else {
          observer.next({ data: { balance: 100 } })
          observer.complete()
        }
      },
    )
    await jest.runAllTimersAsync()
    await expect(result).resolves.toEqual({ data: { balance: 100 } })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("stops a failing read after three attempts", async () => {
    const error = new Error("offline")
    const { request, result } = run(
      gql`
        query Balance {
          balance
        }
      `,
      (observer) => observer.error(error),
    )
    const assertion = expect(result).rejects.toBe(error)
    await jest.runAllTimersAsync()
    await assertion
    expect(request).toHaveBeenCalledTimes(3)
  })
})
