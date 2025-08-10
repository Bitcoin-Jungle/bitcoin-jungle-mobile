import * as React from "react"
import { ActivityIndicator, Text, View } from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import { Slider } from "react-native-elements"


import { translate } from "../../i18n"
import { currencyToTextWithUnits } from "../../utils/currencyConversion"
import { palette } from "../../theme/palette"
import { color } from "../../theme"
import { useThemeColor } from "../../theme/useThemeColor"

type FeeType = {
  value: number | null | undefined
  status: string
  text: string
}

type FeeDetailsProps = {
  fee: FeeType
}

type PaymentConfirmationInformationProps = {
  fee: FeeType
  destination: string
  memo: string
  primaryAmount: MoneyAmount
  secondaryAmount: MoneyAmount
  primaryTotalAmount: MoneyAmount
  secondaryTotalAmount: MoneyAmount
  paymentType: string
  targetConfirmations: Number
  setTargetConfirmations: Function
}

export const PaymentConfirmationInformation = ({
  fee,
  destination,
  memo,
  primaryAmount,
  secondaryAmount,
  primaryTotalAmount,
  secondaryTotalAmount,
  paymentType,
  targetConfirmations,
  setTargetConfirmations,
}: PaymentConfirmationInformationProps): JSX.Element => {
  const styles = useStyles()
  const getEstimatedWaitTime = () => {
    if(targetConfirmations === 1) {
      return `~10 ${translate("common.minutes")}`
    }

    const numHours = Math.floor(targetConfirmations / 6)

    return `~${numHours} ${translate("common.hours")}`
  }

  return (
    <View style={styles.paymentInformation}>
      <View style={styles.paymentInformationRow}>
        <Text style={styles.paymentInformationLabel}>
          {translate("SendBitcoinConfirmationScreen.destinationLabel")}
        </Text>
        {destination?.length > 0 && (
          <Text style={styles.paymentInformationData}>{destination}</Text>
        )}
      </View>

      {memo?.length > 0 && (
        <View style={styles.paymentInformationRow}>
          <Text style={styles.paymentInformationLabel}>
            {translate("SendBitcoinConfirmationScreen.memoLabel")}
          </Text>
          <Text style={styles.paymentInformationData}>{memo}</Text>
        </View>
      )}

      {fee.value === null && (
        <View style={styles.paymentInformationRow}>
          <Text style={styles.paymentInformationLabel}>
            {translate("SendBitcoinConfirmationScreen.amountLabel")}
          </Text>
          <Text style={styles.paymentInformationMainAmount}>
            {currencyToTextWithUnits(primaryAmount)}
          </Text>
          <Text style={styles.paymentInformationSecondaryAmount}>
            {currencyToTextWithUnits(secondaryAmount)}
          </Text>
        </View>
      )}

      {fee.value !== null && (
        <View style={styles.paymentInformationRow}>
          <Text style={styles.paymentInformationLabel}>
            {translate("SendBitcoinConfirmationScreen.totalLabel")}
          </Text>
          <Text style={styles.paymentInformationMainAmount}>
            {currencyToTextWithUnits(primaryTotalAmount)}
          </Text>
          <Text style={styles.paymentInformationSecondaryAmount}>
            {currencyToTextWithUnits(secondaryTotalAmount)}
          </Text>
        </View>
      )}

      <View style={styles.paymentInformationRow}>
        <Text style={styles.paymentInformationLabel}>
          {translate("SendBitcoinConfirmationScreen.feeLabel")}
        </Text>
        <FeeDetails fee={fee} />
      </View>

      {paymentType === "onchain" &&
        <View style={styles.paymentInformationRow}>
          <Text style={styles.paymentInformationLabel}>
            {translate("SendBitcoinConfirmationScreen.confTime")}
          </Text>
          <View style={styles.paymentInformationData}>
            <Slider
              value={targetConfirmations}
              onSlidingComplete={setTargetConfirmations}
              maximumValue={40}
              minimumValue={1}
              step={5}
              thumbTintColor={color.primary}
            />
            <Text>{translate("SendBitcoinConfirmationScreen.waitTime")} {getEstimatedWaitTime()}</Text>
          </View>
        </View>
      }

    </View>
  )
}

const FeeDetails = ({ fee }: FeeDetailsProps): JSX.Element => {
  const styles = useStyles()
  const colors = useThemeColor()
  
  if (fee.status === "loading") {
    return (
      <ActivityIndicator
        style={[styles.activityIndicator, styles.paymentInformationData]}
        animating
        size="small"
        color={colors.primary}
      />
    )
  }

  if (fee.status === "error") {
    return (
      <Text style={styles.paymentInformationData}>
        {translate("SendBitcoinScreen.feeCalculationUnsuccessful")}
      </Text>
    ) // todo: same calculation as backend
  }

  return <Text style={styles.paymentInformationData}>{fee.text}</Text>
}

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
  activityIndicator: {
    alignItems: "flex-start",
  },

  paymentInformation: {
    color: colors.textSecondary,
    flex: 1,
    marginTop: "32rem",
  },

  paymentInformationData: {
    color: colors.text,
    flex: 5,
    fontSize: "18rem",
    textAlignVertical: "bottom",
  },

  paymentInformationLabel: {
    color: colors.textSecondary,
    flex: 2,
    fontSize: "18rem",
  },

  paymentInformationMainAmount: {
    color: colors.text,
    flex: 3,
    fontSize: "18rem",
    textAlignVertical: "bottom",
  },

  paymentInformationRow: {
    flexDirection: "row",
    marginBottom: "12rem",
  },

  paymentInformationSecondaryAmount: {
    color: colors.textSecondary,
    flex: 2,
    fontSize: "18rem",
    textAlignVertical: "bottom",
  },
  })
}
