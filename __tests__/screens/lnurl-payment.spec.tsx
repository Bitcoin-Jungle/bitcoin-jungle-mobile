import * as React from "react"
import { act, create, ReactTestRenderer } from "react-test-renderer"
import { Button } from "react-native-elements"
import { Alert } from "react-native"
import {
  URL as NativeURL,
  URLSearchParams as NativeURLSearchParams,
} from "react-native/Libraries/Blob/URL"
import { getParams } from "js-lnurl"
import { toastShow } from "@app/utils/toast"
import { InputPayment } from "@app/components/input-payment"
import { GaloyInput } from "@app/components/galoy-input"
import {
  SendBitcoinScreen,
  SendBitcoinScreenJSX,
} from "@app/screens/send-bitcoin-screen/send-bitcoin-screen"
import { SendBitcoinConfirmationScreen } from "@app/screens/send-bitcoin-screen/send-bitcoin-confirmation-screen"
import { PaymentConfirmationInformation } from "@app/screens/send-bitcoin-screen/payment-confirmation-information"
import { makeInvoice } from "../helpers/lightning-invoice"

const mockClient = {}
const mockMutation = jest.fn().mockResolvedValue({
  data: { lnInvoicePaymentSend: { status: "SUCCESS", errors: [] } },
})
const mockQuery = jest.fn()
const mockRefetch = jest.fn()
const mockFormat = jest.fn(() => "formatted amount")
let mockPrimaryCurrency = "BTC"
let mockFiatPerSat = 0.36
const mockConvert = ({ amount, from, to }) =>
  from === to
    ? amount
    : from === "BTC"
    ? amount * mockFiatPerSat
    : amount / mockFiatPerSat
const mockSubscription = {
  convertCurrencyAmount: mockConvert,
  formatCurrencyAmount: mockFormat,
}

jest.mock("@apollo/client", () => ({
  ...jest.requireActual("@apollo/client"),
  useApolloClient: () => mockClient,
  useQuery: () => ({
    data: { me: { contacts: [{ lightningAddress: "test@example.com" }] } },
  }),
  useLazyQuery: () => [mockQuery, {}],
  useMutation: () => [mockMutation],
}))
jest.mock("@app/hooks", () => ({
  useMoneyAmount: jest.requireActual("@app/hooks/use-money-amount").useMoneyAmount,
  useMySubscription: () => mockSubscription,
  useWalletBalance: () => ({
    walletId: "test-wallet",
    satBalance: 100000,
    loading: false,
  }),
}))
jest.mock("@app/hooks/user-hooks", () => ({
  useMySubscription: () => mockSubscription,
  useMyCurrencies: () => ({
    primaryCurrency: mockPrimaryCurrency,
    secondaryCurrency: mockPrimaryCurrency === "BTC" ? "USD" : "BTC",
    toggleCurrency: mockQuery,
  }),
}))
jest.mock("@app/hooks/use-main-query", () => () => ({ refetch: mockRefetch }))
jest.mock("@app/utils/use-token", () => () => ({
  tokenNetwork: "mainnet",
  hasToken: true,
}))
jest.mock("@app/utils/parsing", () => ({
  validPayment: (input) =>
    input
      ? {
          valid: true,
          lnurl: input,
          amountless: false,
          staticLnurlIdentifier: input !== "lnurl-test",
        }
      : { valid: false },
}))
// Use the same browser-compatible URL package Metro bundles on the device.
jest.mock("url", () => jest.requireActual("url/"))
jest.mock("js-lnurl", () => ({ getParams: jest.fn() }))
jest.mock("@app/utils/storage/secureStorage", () => ({
  getIsSendLockEnabled: async () => false,
}))
jest.mock("@app/utils/toast", () => ({ toastShow: jest.fn() }))
jest.mock("@app/graphql/query", () => ({ fetchMainQuery: jest.fn() }))
jest.mock("@app/i18n", () => ({
  translate: (key, options) => (options?.username ? `${key}: ${options.username}` : key),
}))
jest.mock("@app/theme/useThemeColor", () => ({ useThemeColor: () => ({}) }))
jest.mock("react-native-extended-stylesheet", () => ({ create: (styles) => styles }))
jest.mock("react-native-elements", () => ({ Button: "Button", Icon: "Icon" }))
jest.mock("@app/components/input-payment", () => ({ InputPayment: "InputPayment" }))
jest.mock("@app/components/galoy-input", () => ({ GaloyInput: "GaloyInput" }))
jest.mock("@app/components/screen", () => ({ Screen: "Screen" }))
jest.mock("@app/components/text-currency/text-currency", () => ({
  TextCurrency: "TextCurrency",
}))
jest.mock("@app/screens/send-bitcoin-screen/use-fee", () => () => ({
  value: 2,
  status: "set",
  text: "2 sats",
}))
jest.mock("@app/screens/send-bitcoin-screen/payment-status-indicator", () => ({
  PaymentStatusIndicator: "PaymentStatusIndicator",
}))
jest.mock("@app/screens/send-bitcoin-screen/payment-confirmation-information", () => ({
  PaymentConfirmationInformation: "PaymentConfirmationInformation",
}))
jest.mock("react-native-haptic-feedback", () => ({ trigger: jest.fn() }))

let tree: ReactTestRenderer
const navigation = { navigate: jest.fn(), pop: jest.fn(), isFocused: () => true }
const originalFetch = global.fetch
const originalURL = global.URL
const originalURLSearchParams = global.URLSearchParams

beforeEach(() => {
  jest.clearAllMocks()
  mockPrimaryCurrency = "BTC"
  mockFiatPerSat = 0.36
  global.IS_REACT_ACT_ENVIRONMENT = true
})
afterEach(async () => {
  if (tree) await act(async () => tree.unmount())
  global.fetch = originalFetch
  global.URL = originalURL
  global.URLSearchParams = originalURLSearchParams
  jest.useRealTimers()
  jest.restoreAllMocks()
})

const paramsFor = (callback = "https://example.com/cb?amount=999") => ({
  tag: "payRequest",
  callback,
  domain: "example.com",
  minSendable: 1000,
  maxSendable: 100000000,
  commentAllowed: 0,
})

const showSend = async (payment, lnurlParams = paramsFor(), amount = 151) => {
  await act(async () => {
    tree = create(
      <SendBitcoinScreen
        navigation={navigation}
        route={{
          params: {
            payment,
            lnurlParams,
          },
        }}
      />,
    )
  })
  await act(async () => tree.root.findByType(InputPayment).props.onUpdateAmount(amount))
}

const requestInvoice = async (response, payment = "lnurl-test", amount = 151) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => response })
  await showSend(payment, paramsFor(), amount)
  await act(async () => tree.root.findByType(Button).props.onPress())
}

describe.each(["lnurl-test", "test@example.com"])("LNURL callback for %s", (payment) => {
  it.each([
    { pr: makeInvoice("2461000") },
    { pr: makeInvoice("150000") },
    { pr: makeInvoice("151001") },
    { pr: makeInvoice() },
    { pr: "malformed" },
    {},
    null,
  ])(
    "blocks an invalid callback response and keeps the warning visible: %p",
    async (response) => {
      await requestInvoice(response, payment)
      expect(navigation.navigate).not.toHaveBeenCalled()
      expect(tree.root.findByType(Button).props.title).toBe("lnurl.invalidInvoiceAmount")
      expect(tree.root.findByType(Button).props.disabled).toBe(true)
      const url = new URL((global.fetch as jest.Mock).mock.calls[0][0])
      expect(url.searchParams.getAll("amount")).toEqual(["151000"])
    },
  )

  it("accepts a matching invoice and freezes the requested sats for confirmation", async () => {
    const pr = makeInvoice("151000")
    await requestInvoice({ pr }, payment)
    expect(navigation.navigate).toHaveBeenCalledWith(
      "sendBitcoinConfirmation",
      expect.objectContaining({
        invoice: pr,
        amountless: false,
        referenceAmount: { value: 151, currency: "BTC" },
      }),
    )
  })
})

it("clears a rejected invoice warning when leaving the LNURL flow", async () => {
  await requestInvoice({ pr: makeInvoice("2461000") })
  await act(async () => tree.root.findAllByType(GaloyInput)[0].props.onChangeText(""))
  expect(tree.root.findByType(SendBitcoinScreenJSX).props.lnurlError).toBe("")
})

it("freezes the rounded fiat conversion and allows recovery after an error", async () => {
  mockPrimaryCurrency = "USD"
  await requestInvoice({ pr: makeInvoice("2461000") }, "lnurl-test", 54.5)
  expect(navigation.navigate).not.toHaveBeenCalled()
  await act(async () => tree.root.findByType(InputPayment).props.onUpdateAmount(54.6))
  expect(tree.root.findByType(Button).props.title).toBe("common.send")
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ pr: makeInvoice("152000") }),
  })
  await act(async () => tree.root.findByType(Button).props.onPress())
  expect(navigation.navigate).toHaveBeenCalledWith(
    "sendBitcoinConfirmation",
    expect.objectContaining({
      referenceAmount: { value: 152, currency: "BTC" },
      primaryCurrency: "USD",
    }),
  )
})

const showConfirmation = async (invoice, overrides = {}) => {
  await act(async () => {
    tree = create(
      <SendBitcoinConfirmationScreen
        navigation={navigation as never}
        route={{
          key: "confirmation",
          name: "sendBitcoinConfirmation",
          params: {
            address: null,
            amountless: false,
            invoice,
            memo: null,
            paymentType: "lnurl",
            primaryCurrency: "USD",
            referenceAmount: { value: 151, currency: "BTC" },
            sameNode: false,
            username: null,
            recipientDefaultWalletId: null,
            ...overrides,
          },
        }}
      />,
    )
  })
}

it.each([makeInvoice("2461000"), makeInvoice(), "invalid", null])(
  "blocks invalid invoices at confirmation without submitting a payment: %p",
  async (invoice) => {
    await showConfirmation(invoice)
    expect(tree.root.findByType(Button).props.title).toBe("common.cancel")
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(mockMutation).not.toHaveBeenCalled()
  },
)

it.each([{ amountless: true }, { referenceAmount: { value: 54.36, currency: "USD" } }])(
  "rejects LNURL confirmation without a fixed BTC amount: %p",
  async (overrides) => {
    await showConfirmation(makeInvoice("151000"), overrides)
    expect(tree.root.findByType(Button).props.title).toBe("common.cancel")
    expect(mockMutation).not.toHaveBeenCalled()
  },
)

it("shows fixed sats plus fees after a rate change and pays the matching invoice", async () => {
  mockFiatPerSat = 0.72
  const invoice = makeInvoice("151000")
  await showConfirmation(invoice)
  const info = tree.root.findByType(PaymentConfirmationInformation).props
  expect(info.secondaryAmount).toEqual({ value: 151, currency: "BTC" })
  expect(info.secondaryTotalAmount).toEqual({ value: 153, currency: "BTC" })
  await act(async () => tree.root.findByType(Button).props.onPress())
  expect(mockMutation).toHaveBeenCalledWith({
    variables: {
      input: {
        walletId: "test-wallet",
        paymentRequest: invoice,
        memo: null,
      },
    },
  })
})

const deferred = <T,>() => {
  let resolve: (value: T) => void
  let reject: (reason: Error) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}
const editRecipient = async (destination) => {
  await act(async () =>
    tree.root.findAllByType(GaloyInput)[0].props.onChangeText(destination),
  )
}
const finishDebounce = async () => {
  await act(async () => jest.advanceTimersByTime(1500))
}
const sendProps = () => tree.root.findByType(SendBitcoinScreenJSX).props
const confirmRecipient = () => (Alert.alert as jest.Mock).mock.calls[0][2][1].onPress()

describe("recipient changes during LNURL payments", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined)
    ;(getParams as jest.Mock)
      .mockReset()
      .mockImplementation(() => new Promise(() => undefined))
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pr: makeInvoice("151000") }),
    })
  })

  it("replaces scanned parameters before warning, saving, or paying the edited address", async () => {
    const lookup = deferred<ReturnType<typeof paramsFor>>()
    ;(getParams as jest.Mock).mockReturnValue(lookup.promise)
    await showSend("test@example.com", paramsFor("https://first.example/cb"))
    await editRecipient("second@example.com")
    expect(tree.root.findByType(Button).props.disabled).toBe(true)
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(mockMutation).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()

    await finishDebounce()
    expect(getParams).toHaveBeenCalledWith("second@example.com")
    await act(async () => lookup.resolve(paramsFor("https://second.example/cb")))
    expect(tree.root.findByType(Button).props.disabled).toBe(false)
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(Alert.alert).toHaveBeenCalledWith(
      "SendBitcoinScreen.firstTimeRecipientTitle",
      "SendBitcoinScreen.firstTimeRecipientMessage: second@example.com",
      expect.any(Array),
    )
    await act(async () => confirmRecipient())
    expect(mockMutation).toHaveBeenCalledWith({
      variables: { input: { lightningAddress: "second@example.com" } },
    })
    expect(new URL((global.fetch as jest.Mock).mock.calls[0][0]).hostname).toBe(
      "second.example",
    )
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
  })

  it("ignores a previous lookup that completes after the current lookup", async () => {
    const first = deferred<ReturnType<typeof paramsFor>>()
    const second = deferred<ReturnType<typeof paramsFor>>()
    ;(getParams as jest.Mock)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    await showSend("first@example.com", null)
    await finishDebounce()
    await editRecipient("test@example.com")
    await finishDebounce()
    await act(async () => second.resolve(paramsFor("https://second.example/cb")))
    await act(async () => first.resolve(paramsFor("https://first.example/cb")))
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(new URL((global.fetch as jest.Mock).mock.calls[0][0]).hostname).toBe(
      "second.example",
    )
  })

  it("keeps Send blocked when an obsolete lookup succeeds while the current lookup is pending", async () => {
    const first = deferred<ReturnType<typeof paramsFor>>()
    ;(getParams as jest.Mock).mockReturnValueOnce(first.promise)
    await showSend("first@example.com", null)
    await finishDebounce()
    await editRecipient("test@example.com")
    await finishDebounce()
    await act(async () => first.resolve(paramsFor("https://first.example/cb")))
    expect(tree.root.findByType(Button).props.disabled).toBe(true)
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("ignores the original lookup after changing away and back to the same address", async () => {
    const original = deferred<ReturnType<typeof paramsFor>>()
    const latest = deferred<ReturnType<typeof paramsFor>>()
    ;(getParams as jest.Mock)
      .mockReturnValueOnce(original.promise)
      .mockReturnValueOnce(latest.promise)
    await showSend("test@example.com", null)
    await finishDebounce()
    await editRecipient("second@example.com")
    await editRecipient("test@example.com")
    await finishDebounce()
    await act(async () => latest.resolve(paramsFor("https://latest.example/cb")))
    await act(async () => original.resolve(paramsFor("https://original.example/cb")))
    expect(sendProps().lnurlPay.callback).toBe("https://latest.example/cb")
  })

  it("revalidates freshly scanned parameters for the same recipient", async () => {
    await showSend("test@example.com", paramsFor("https://original.example/cb"))
    const { route } = tree.root.findByType(SendBitcoinScreen).props
    await act(async () =>
      tree.update(
        <SendBitcoinScreen
          navigation={navigation}
          route={{
            ...route,
            params: {
              ...route.params,
              lnurlParams: paramsFor("https://rescanned.example/cb"),
            },
          }}
        />,
      ),
    )
    await act(async () => tree.root.findByType(InputPayment).props.onUpdateAmount(151))
    expect(tree.root.findByType(Button).props.disabled).toBe(false)
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(new URL((global.fetch as jest.Mock).mock.calls[0][0]).hostname).toBe(
      "rescanned.example",
    )
  })

  it("revalidates when recipient edits are batched back to the original address", async () => {
    await showSend("test@example.com")
    await act(async () => {
      const edit = tree.root.findAllByType(GaloyInput)[0].props.onChangeText
      edit("second@example.com")
      edit("test@example.com")
    })
    expect(tree.root.findByType(Button).props.disabled).toBe(false)
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("does not let an obsolete failure invalidate the new recipient", async () => {
    const first = deferred<ReturnType<typeof paramsFor>>()
    ;(getParams as jest.Mock)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(paramsFor("https://second.example/cb"))
    await showSend("first@example.com", null)
    await finishDebounce()
    await editRecipient("test@example.com")
    await finishDebounce()
    await act(async () => first.reject(new Error("old lookup failed")))
    expect(sendProps().destinationStatus).toBe("VALID")
    expect(toastShow).not.toHaveBeenCalled()
  })

  it("cancels lookups that have not started when the recipient is cleared", async () => {
    await showSend("test@example.com", null)
    await editRecipient("")
    await finishDebounce()
    expect(getParams).not.toHaveBeenCalled()
    expect(sendProps().isStaticLnurlIdentifier).toBe(false)
  })

  it("ignores a previously captured Send action after the recipient changes", async () => {
    await showSend("test@example.com")
    const send = tree.root.findByType(Button).props.onPress
    await editRecipient("second@example.com")
    await act(async () => send())
    expect(global.fetch).not.toHaveBeenCalled()
    expect(Alert.alert).not.toHaveBeenCalled()
  })

  it("does not save a contact or fetch an invoice from an obsolete recipient alert", async () => {
    await showSend("first@example.com")
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(Alert.alert).toHaveBeenCalledTimes(1)
    await editRecipient("second@example.com")
    await act(async () => confirmRecipient())
    expect(mockMutation).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("does not continue payment when the recipient changes while a contact is being saved", async () => {
    const saving = deferred<object>()
    mockMutation.mockReturnValueOnce(saving.promise)
    await showSend("first@example.com")
    await act(async () => tree.root.findByType(Button).props.onPress())
    let confirmation: Promise<void>
    act(() => {
      confirmation = confirmRecipient()
    })
    expect(mockMutation).toHaveBeenCalledTimes(1)
    await editRecipient("second@example.com")
    await act(async () => {
      saving.resolve({})
      await confirmation
    })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it.each([
    { pr: makeInvoice("151000") },
    { status: "ERROR", reason: "old callback error" },
  ])(
    "ignores an invoice response received after the recipient changes: %p",
    async (response) => {
      const invoice = deferred<object>()
      ;(global.fetch as jest.Mock).mockReturnValueOnce(invoice.promise)
      await showSend("test@example.com")
      await act(async () => tree.root.findByType(Button).props.onPress())
      await editRecipient("second@example.com")
      await act(async () => invoice.resolve({ ok: true, json: async () => response }))
      expect(navigation.navigate).not.toHaveBeenCalled()
      expect(sendProps().lnurlError).not.toBe("old callback error")
    },
  )

  it("cancels a fixed-amount update belonging to the previous recipient", async () => {
    await showSend(
      "test@example.com",
      { ...paramsFor(), minSendable: 151000, maxSendable: 151000 },
      200,
    )
    await editRecipient("second@example.com")
    await act(async () => jest.advanceTimersByTime(100))
    expect(tree.root.findByType(InputPayment).props.primaryAmount.value).toBe(200)
  })

  it("cancels queued lookups on unmount", async () => {
    await showSend("test@example.com", null)
    await act(async () => tree.unmount())
    await finishDebounce()
    expect(getParams).not.toHaveBeenCalled()
  })

  it("ignores lookup failures after unmount", async () => {
    const lookup = deferred<ReturnType<typeof paramsFor>>()
    ;(getParams as jest.Mock).mockReturnValue(lookup.promise)
    await showSend("test@example.com", null)
    await finishDebounce()
    await act(async () => tree.unmount())
    await act(async () => lookup.reject(new Error("unmounted")))
    expect(toastShow).not.toHaveBeenCalled()
  })
})

describe("Lightning addresses on the React Native URL runtime", () => {
  beforeEach(() => {
    global.URL = NativeURL as unknown as typeof URL
    global.URLSearchParams = NativeURLSearchParams as unknown as typeof URLSearchParams
    expect(() =>
      new global.URL("https://example.com").searchParams.set("amount", "1"),
    ).toThrow("URLSearchParams.set is not implemented")
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pr: makeInvoice("151000") }),
    })
  })

  it("allows an empty optional comment", async () => {
    await showSend("test@example.com", { ...paramsFor(), commentAllowed: 255 })
    expect(tree.root.findByType(Button).props.title).toBe("common.send")
    expect(tree.root.findByType(Button).props.disabled).toBe(false)
    await act(async () => tree.root.findByType(Button).props.onPress())
    const request = new originalURL((global.fetch as jest.Mock).mock.calls[0][0])
    expect(request.searchParams.has("comment")).toBe(false)
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
  })

  it.each([
    "https://example.com/cb",
    "https://example.com/cb/?token=keep%2Bthis&amount=999&amount=888#receipt",
  ])("requests an invoice without native URLSearchParams.set: %s", async (callback) => {
    await showSend("test@example.com", paramsFor(callback))
    await act(async () => tree.root.findByType(Button).props.onPress())
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const request = new originalURL((global.fetch as jest.Mock).mock.calls[0][0])
    expect(request.searchParams.getAll("amount")).toEqual(["151000"])
    expect(request.pathname).toBe(new originalURL(callback).pathname)
    expect(request.hash).toBe(new originalURL(callback).hash)
    expect(request.searchParams.get("token")).toBe(
      new originalURL(callback).searchParams.get("token"),
    )
    expect(navigation.navigate).toHaveBeenCalledWith(
      "sendBitcoinConfirmation",
      expect.objectContaining({
        referenceAmount: { value: 151, currency: "BTC" },
      }),
    )
  })

  it.each([0, undefined, 255])(
    "sends a note only when the service allows it (%s)",
    async (commentAllowed) => {
      const memo = "Gracias & café + pura vida!"
      await showSend("test@example.com", {
        ...paramsFor("https://example.com/cb?comment=old&comment=older"),
        commentAllowed,
      })
      await act(async () =>
        tree.root.findAllByType(GaloyInput)[1].props.onChangeText(memo),
      )
      await act(async () => tree.root.findByType(Button).props.onPress())
      const request = new originalURL((global.fetch as jest.Mock).mock.calls[0][0])
      expect(request.searchParams.getAll("comment")).toEqual(commentAllowed ? [memo] : [])
      expect(navigation.navigate).toHaveBeenCalledWith(
        "sendBitcoinConfirmation",
        expect.objectContaining({ memo }),
      )
    },
  )
})

it("enforces the service's maximum note length and allows shortening the note", async () => {
  await showSend("test@example.com", { ...paramsFor(), commentAllowed: 3 })
  expect(tree.root.findAllByType(GaloyInput)[1].props.maxLength).toBe(3)
  await act(async () => tree.root.findAllByType(GaloyInput)[1].props.onChangeText("four"))
  expect(tree.root.findByType(Button).props.title).toBe("lnurl.commentTooLong")
  expect(tree.root.findByType(Button).props.disabled).toBe(true)
  await act(async () => tree.root.findAllByType(GaloyInput)[1].props.onChangeText("ok"))
  expect(tree.root.findByType(Button).props.title).toBe("common.send")
  expect(tree.root.findByType(Button).props.disabled).toBe(false)
})

it("shows callback network errors instead of silently stopping", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("offline"))
  await showSend("test@example.com")
  await act(async () => tree.root.findByType(Button).props.onPress())
  expect(tree.root.findByType(Button).props.title).toBe("errors.network.server")
  expect(navigation.navigate).not.toHaveBeenCalled()
})
