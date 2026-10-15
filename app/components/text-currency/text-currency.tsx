import * as currency_fmt from "currency.js"
import * as React from "react"
import { Text, TextStyle } from "react-native"
import type { ComponentType } from "../../types/jsx"

type Props = {
  amount: number
  currency: CurrencyType
  style: TextStyle
}

export const TextCurrency: ComponentType = ({ amount, currency, style }: Props) => {
  // "USD" is this fork's legacy fiat key; the amount hooks and keypad use colones.
  if (currency === "CRC" || currency === "USD") {
    const amountDisplay = Number.isNaN(amount)
      ? "..."
      : currency_fmt
          .default(amount, { precision: 2, symbol: "₡", separator: ".", decimal: "," })
          .format()
    return <Text style={style}>{amountDisplay}</Text>
  }
  if (currency === "BTC") {
    return Number.isNaN(amount) ? (
      <Text style={style}>...</Text>
    ) : (
      <Text style={style}>
        {currency_fmt
          .default(amount, {
            precision: 0,
            separator: ".",
            decimal: ",",
            symbol: "",
          })
          .format()}{" "}
        sats
      </Text>
    )
  }
  return null
}
