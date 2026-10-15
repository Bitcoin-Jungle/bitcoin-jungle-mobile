import * as React from "react"
import { act, create, ReactTestRenderer } from "react-test-renderer"
import { Button } from "react-native-elements"
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
          lnurl: "lnurl-test",
          amountless: false,
          staticLnurlIdentifier: input === "test@example.com",
        }
      : { valid: false },
}))
jest.mock("@app/utils/storage/secureStorage", () => ({
  getIsSendLockEnabled: async () => false,
}))
jest.mock("@app/utils/toast", () => ({ toastShow: jest.fn() }))
jest.mock("@app/graphql/query", () => ({ fetchMainQuery: jest.fn() }))
jest.mock("@app/i18n", () => ({ translate: (key) => key }))
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

beforeEach(() => {
  jest.clearAllMocks()
  mockPrimaryCurrency = "BTC"
  mockFiatPerSat = 0.36
  global.IS_REACT_ACT_ENVIRONMENT = true
})
afterEach(async () => {
  if (tree) await act(async () => tree.unmount())
  global.fetch = originalFetch
})

const requestInvoice = async (response, payment = "lnurl-test", amount = 151) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => response })
  await act(async () => {
    tree = create(
      <SendBitcoinScreen
        navigation={navigation}
        route={{
          params: {
            payment,
            lnurlParams: {
              tag: "payRequest",
              callback: "https://example.com/cb?amount=999",
              domain: "example.com",
              minSendable: 1000,
              maxSendable: 100000000,
              commentAllowed: 0,
            },
          },
        }}
      />,
    )
  })
  await act(async () => tree.root.findByType(InputPayment).props.onUpdateAmount(amount))
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
