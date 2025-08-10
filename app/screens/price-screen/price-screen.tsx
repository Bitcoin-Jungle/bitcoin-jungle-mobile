import * as React from "react"
import { BalanceHeader } from "../../components/balance-header"
import { PriceGraphDataInjected } from "../../components/price-graph"
import { Screen } from "../../components/screen"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import type { ScreenType } from "../../types/jsx"

export const PriceScreen: ScreenType = () => {
  const colors = useThemeColor()
  
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <Screen backgroundColor={colors.background} preset="scroll" style={{ flex: 1 }}>
      {/* <BalanceHeader showSecondaryCurrency={false} /> */}
      <PriceGraphDataInjected />
    </Screen>
  )
}
