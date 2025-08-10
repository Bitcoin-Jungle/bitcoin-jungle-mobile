/* eslint-disable @typescript-eslint/no-var-requires */
import * as React from "react"
import { Text } from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import LottieView from "lottie-react-native"

import { translate } from "../../i18n"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"

import successLottieJson from "./success_lottie.json"
import errorLottieJson from "./error_lottie.json"
import pendingLottieJson from "./pending_lottie.json"

type Props = {
  errs: { message: string }[]
  status: string
}

export const PaymentStatusIndicator = ({ errs, status }: Props): JSX.Element => {
  const styles = useStyles()
  if (status === "success") {
    return (
      <>
        <LottieView
          source={successLottieJson}
          loop={false}
          autoPlay
          style={styles.lottie}
          resizeMode="cover"
        />
        <Text style={styles.successLottieText}>
          {translate("SendBitcoinScreen.success")}
        </Text>
      </>
    )
  }

  if (status === "error") {
    return (
      <>
        <LottieView
          source={errorLottieJson}
          loop={false}
          autoPlay
          style={styles.lottie}
          resizeMode="cover"
        />
        {errs.map(({ message }, item) => (
          <Text key={`error-${item}`} style={styles.errorText}>
            {message}
          </Text>
        ))}
      </>
    )
  }

  if (status === "pending") {
    return (
      <>
        <LottieView
          source={pendingLottieJson}
          loop={false}
          autoPlay
          style={styles.lottie}
          resizeMode="cover"
        />
        <Text style={styles.pendingLottieText}>
          {translate("SendBitcoinScreen.notConfirmed")}
        </Text>
      </>
    )
  }

  return null
}

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
    errorText: {
      color: colors.error,
      fontSize: 18,
      textAlign: "center",
    },

    lottie: {
      height: "150rem",
      width: "150rem",
    },

    pendingLottieText: {
      color: colors.text,
      fontSize: 18,
      textAlign: "center",
    },

    successLottieText: {
      color: colors.text,
      fontSize: 18,
      textAlign: "center",
    },
  })
}
