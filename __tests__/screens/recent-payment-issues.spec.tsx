import * as React from "react"
import { act, create, ReactTestRenderer } from "react-test-renderer"
import { Text } from "react-native"
import { GaloyInput } from "../../app/components/galoy-input"
import { ApolloError } from "@apollo/client"
import { SendBitcoinScreen } from "../../app/screens/send-bitcoin-screen/send-bitcoin-screen"
import { SendBitcoinConfirmationScreen } from "../../app/screens/send-bitcoin-screen/send-bitcoin-confirmation-screen"
import { PaymentStatusIndicator } from "../../app/screens/send-bitcoin-screen/payment-status-indicator"
import { TextCurrency } from "../../app/components/text-currency/text-currency"
import { InputPayment } from "../../app/components/input-payment"
import { Button } from "react-native-elements"
import pendingAnimation from "../../app/screens/send-bitcoin-screen/pending_lottie.json"

// Exercise the screen state and real amount/parser/formatting logic, with native
// widgets and external wallet services replaced at their boundaries.
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const mockClient = {}
const mockSend = jest.fn()
const mockRefetch = jest.fn()
const mockWallet = { walletId: "wallet", satBalance: 1000000, loading: false }
let mockCurrency = "BTC"
const mockSubscription = {
  convertCurrencyAmount: ({ amount, from, to }) =>
    from === to ? amount : to === "BTC" ? amount * 10 : amount / 10,
  formatCurrencyAmount: ({ sats }) => `${sats}`,
}
jest.mock("@apollo/client", () => ({
  ...jest.requireActual("@apollo/client"),
  useApolloClient: () => mockClient,
  useQuery: () => ({ data: {} }),
  useLazyQuery: () => [jest.fn(), {}],
  useMutation: () => [mockSend],
}))
jest.mock("../../app/hooks", () => ({
  useMoneyAmount: jest.requireActual("../../app/hooks/use-money-amount").useMoneyAmount,
  useWalletBalance: () => mockWallet,
  useMySubscription: () => mockSubscription,
}))
jest.mock("../../app/hooks/user-hooks", () => ({
  useMySubscription: () => mockSubscription,
  useMyCurrencies: () => ({
    primaryCurrency: mockCurrency,
    secondaryCurrency: mockCurrency === "BTC" ? "USD" : "BTC",
    toggleCurrency: jest.fn(),
  }),
}))
jest.mock("../../app/hooks/use-main-query", () => ({
  __esModule: true,
  default: () => ({ myPubKey: "", username: "me", refetch: mockRefetch }),
}))
jest.mock("../../app/utils/use-token", () => ({
  __esModule: true,
  default: () => ({ tokenNetwork: "mainnet", hasToken: true }),
}))
jest.mock("../../app/utils/storage/secureStorage", () => ({
  __esModule: true,
  default: { getIsSendLockEnabled: async () => false },
}))
jest.mock("../../app/utils/toast", () => ({ toastShow: jest.fn() }))
jest.mock("../../app/graphql/query", () => ({ fetchMainQuery: jest.fn() }))
jest.mock("../../app/screens/send-bitcoin-screen/use-fee", () => ({
  __esModule: true,
  default: () => ({ value: 0, status: "set", text: "0" }),
}))
jest.mock("../../app/i18n", () => ({ translate: (key) => key }))
jest.mock("../../app/theme/useThemeColor", () => ({ useThemeColor: () => ({}) }))
jest.mock("react-native-extended-stylesheet", () => ({ create: (styles) => styles }))
jest.mock("react-native-elements", () => ({ Button: "Button", Icon: "Icon" }))
jest.mock("react-native-haptic-feedback", () => ({ trigger: jest.fn() }))
jest.mock("lottie-react-native", () => "LottieView")
jest.mock("../../app/components/input-payment", () => ({ InputPayment: "InputPayment" }))
jest.mock("../../app/components/galoy-input", () => ({ GaloyInput: "GaloyInput" }))
jest.mock("../../app/components/screen", () => ({ Screen: "Screen" }))
jest.mock(
  "../../app/screens/send-bitcoin-screen/payment-confirmation-information",
  () => ({
    PaymentConfirmationInformation: "PaymentConfirmationInformation",
  }),
)

const address = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
const navigation = { navigate: jest.fn(), pop: jest.fn(), isFocused: () => true }
let screen: ReactTestRenderer
const mount = async (element) => {
  await act(async () => {
    screen = create(element)
  })
}
const update = async (element) => {
  await act(async () => {
    screen.update(element)
  })
}
const sendScreen = (params = {}) => (
  <SendBitcoinScreen navigation={navigation} route={{ params }} />
)
const confirmation = () => (
  <SendBitcoinConfirmationScreen
    navigation={navigation}
    route={{
      key: "confirmation",
      name: "sendBitcoinConfirmation",
      params: {
        address: null,
        amountless: false,
        invoice: "lnbc-test",
        memo: "",
        paymentType: "lightning",
        primaryCurrency: "BTC",
        referenceAmount: { currency: "BTC", value: 100 },
        sameNode: false,
        username: null,
        recipientDefaultWalletId: null,
      },
    }}
  />
)
const pressPay = async () => {
  await act(async () => {
    screen.root.findByType(Button).props.onPress()
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  mockCurrency = "BTC"
  mockWallet.loading = false
})
afterEach(async () => {
  if (screen) await act(async () => screen.unmount())
  jest.clearAllTimers()
  jest.useRealTimers()
})

describe("#28: scanned on-chain amounts", () => {
  it.each(["BTC", "USD"])(
    "keeps the typed %s amount for an amountless scan",
    async (currency) => {
      mockCurrency = currency
      await mount(sendScreen())
      await act(async () =>
        screen.root.findByType(InputPayment).props.onUpdateAmount(450),
      )
      await update(sendScreen({ payment: address }))
      expect(screen.root.findByType(InputPayment).props.primaryAmount).toEqual({
        value: 450,
        currency,
      })
      await pressPay()
      expect(navigation.navigate).toHaveBeenCalledWith(
        "sendBitcoinConfirmation",
        expect.objectContaining({
          address,
          amountless: true,
          referenceAmount: { value: 450, currency },
        }),
      )
    },
  )

  it("uses an explicit BIP21 amount instead of the previously typed value", async () => {
    await mount(sendScreen())
    await act(async () => screen.root.findByType(InputPayment).props.onUpdateAmount(450))
    await update(sendScreen({ payment: `bitcoin:${address}?amount=0.00001` }))
    expect(screen.root.findByType(InputPayment).props.primaryAmount.value).toBe(1000)
    await pressPay()
    expect(navigation.navigate).toHaveBeenCalledWith(
      "sendBitcoinConfirmation",
      expect.objectContaining({
        amountless: false,
        referenceAmount: { value: 1000, currency: "BTC" },
      }),
    )
  })

  it("still clears the amount when removing a destination", async () => {
    await mount(sendScreen())
    await act(async () => screen.root.findByType(InputPayment).props.onUpdateAmount(450))
    await update(sendScreen({ payment: address }))
    const clear = screen.root.findAllByType(GaloyInput)[0].props.rightIcon
    await act(async () => clear.props.onPress())
    expect(screen.root.findByType(InputPayment).props.primaryAmount.value).toBe(0)
  })

  it("clears the amount for a new recipient route", async () => {
    await mount(sendScreen())
    await act(async () => screen.root.findByType(InputPayment).props.onUpdateAmount(450))
    await update(sendScreen({ username: "recipient" }))
    expect(screen.root.findByType(InputPayment).props.primaryAmount.value).toBe(0)
  })
})

describe("#26: colones subtitle", () => {
  it.each(["USD", "CRC"])("renders %s as colones", async (currency) => {
    await mount(<TextCurrency amount={1234.5} currency={currency} style={{}} />)
    expect(JSON.stringify(screen.toJSON())).toContain("₡1.234,50")
  })

  it("shows colones beneath a sats amount on Send", async () => {
    await mount(sendScreen())
    await act(async () => screen.root.findByType(InputPayment).props.onUpdateAmount(450))
    expect(
      screen.root.findAllByType(Text).some((text) => text.props.children === "₡45,00"),
    ).toBe(true)
  })
})

describe("#30: payment outcome after connection loss", () => {
  it("shows an uncertain outcome without a failure animation or a retry button", async () => {
    mockSend.mockRejectedValueOnce(
      new ApolloError({ networkError: new Error("offline") }),
    )
    await mount(confirmation())
    await pressPay()
    expect(screen.root.findByType(PaymentStatusIndicator).props.status).toBe("unknown")
    expect(screen.root.findByType("LottieView").props.source).toBe(pendingAnimation)
    expect(JSON.stringify(screen.toJSON())).toContain("SendBitcoinScreen.resultUnknown")
    mockWallet.loading = true
    await update(confirmation())
    mockWallet.loading = false
    await update(confirmation())
    expect(screen.root.findByType(PaymentStatusIndicator).props.status).toBe("unknown")
    expect(screen.root.findByType(Button).props.title).toBe("common.close")
    await pressPay()
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(navigation.pop).toHaveBeenCalledWith(2)
  })

  it.each(["SUCCESS", "PENDING", "ALREADY_PAID"])(
    "preserves %s through wallet refresh",
    async (status) => {
      mockSend.mockResolvedValueOnce({
        data: { lnInvoicePaymentSend: { status, errors: [] } },
      })
      await mount(confirmation())
      await pressPay()
      const outcome = screen.root.findByType(PaymentStatusIndicator).props
      if (status === "ALREADY_PAID")
        expect(outcome.errs).toEqual([{ message: "SendBitcoinScreen.alreadyPaid" }])
      mockWallet.loading = true
      await update(confirmation())
      mockWallet.loading = false
      await update(confirmation())
      expect(screen.root.findByType(PaymentStatusIndicator).props).toEqual(outcome)
      expect(screen.root.findByType(Button).props.title).toBe("common.close")
      await pressPay()
      expect(mockSend).toHaveBeenCalledTimes(1)
    },
  )

  it("keeps an in-flight payment busy when wallet loading changes", async () => {
    let complete
    mockSend.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    await mount(confirmation())
    await pressPay()
    mockWallet.loading = true
    await update(confirmation())
    mockWallet.loading = false
    await update(confirmation())
    expect(screen.root.findByType(Button).props.loading).toBe(true)
    await act(async () =>
      complete({ data: { lnInvoicePaymentSend: { status: "SUCCESS", errors: [] } } }),
    )
    expect(screen.root.findByType(Button).props.title).toBe("common.close")
  })
})
