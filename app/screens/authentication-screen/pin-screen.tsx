import * as React from "react"
import { useEffect, useState } from "react"
import { Alert, StatusBar, Text, View } from "react-native"
import { Button, Icon } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
// import Icon from "react-native-vector-icons/Feather"
import { useApolloClient } from "@apollo/client"

import { Screen } from "../../components/screen"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import { useTheme } from "../../theme/theme-context"
import { translate } from "../../i18n"
import KeyStoreWrapper from "../../utils/storage/secureStorage"
import type { ScreenType } from "../../types/jsx"
import { PinScreenPurpose } from "../../utils/enum"
import { sleep } from "../../utils/sleep"
import { showModalClipboardIfValidPayment } from "../../utils/clipboard"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { StackNavigationProp } from "@react-navigation/stack"
import { RouteProp } from "@react-navigation/native"
import useToken from "../../utils/use-token"
import useLogout from "../../hooks/use-logout"
import useMainQuery from "@app/hooks/use-main-query"

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
    bottomSpacer: {
      flex: 1,
    },

    circleContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 32,
    },

    circles: {
      flex: 2,
      flexDirection: "row",
    },

    container: {
      alignItems: "center",
      flex: 1,
      width: "100%",
    },

    emptyCircle: {
      backgroundColor: colors.transparent,
      borderColor: colors.buttonPrimaryText,
      borderRadius: 16 / 2,
      borderWidth: 2,
      height: 16,
      width: 16,
    },

    filledCircle: {
      backgroundColor: colors.buttonPrimaryText,
      borderRadius: 16 / 2,
      height: 16,
      width: 16,
    },

    helperText: {
      color: colors.buttonPrimaryText,
      fontSize: 20,
    },

    helperTextContainer: {
      flex: 1,
    },

    pinPad: {
      alignItems: "center",
      flexDirection: "column",
      flex: 6,
      justifyContent: "center",
    },

    pinPadButton: {
      backgroundColor: colors.surface,
      borderRadius: 35,
      height: 70,
      width: 70,
      alignItems: "center",
      justifyContent: "center",
    },

    pinPadButtonContainer: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      padding: 8,
    },

    pinPadButtonIcon: {
      color: colors.buttonPrimaryText,
      fontSize: 28,
    },

    pinPadButtonTitle: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "600",
    },

    pinPadRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 16,
    },

    topSpacer: {
      flex: 1,
    },
  })
}

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "pin">
  route: RouteProp<RootStackParamList, "pin">
}

export const PinScreen: ScreenType = ({ route, navigation }: Props) => {
  const colors = useThemeColor()
  const { isDark } = useTheme()
  const styles = useStyles()
  const client = useApolloClient()
  const { hasToken, tokenNetwork } = useToken()
  const { logout } = useLogout()
  const { myPubKey, username } = useMainQuery()
  const { screenPurpose } = route.params

  const [enteredPIN, setEnteredPIN] = useState("")
  const [helperText, setHelperText] = useState(
    screenPurpose === PinScreenPurpose.SetPin ? translate("PinScreen.setPin") : "",
  )
  const [previousPIN, setPreviousPIN] = useState("")
  const [pinAttempts, setPinAttempts] = useState(0)

  const MAX_PIN_ATTEMPTS = 3

  useEffect(() => {
    ;(async () => {
      setPinAttempts(await KeyStoreWrapper.getPinAttemptsOrZero())
    })()
  }, [])

  const handleCompletedPinForAuthenticatePin = async (newEnteredPIN: string) => {
    if (newEnteredPIN === (await KeyStoreWrapper.getPinOrEmptyString())) {
      KeyStoreWrapper.resetPinAttempts()
      navigation.reset({
        index: 0,
        routes: [{ name: "Primary" }],
      })
      hasToken &&
        showModalClipboardIfValidPayment({
          client,
          network: tokenNetwork,
          myPubKey,
          username,
        })
    } else {
      if (pinAttempts < MAX_PIN_ATTEMPTS - 1) {
        const newPinAttempts = pinAttempts + 1
        KeyStoreWrapper.setPinAttempts(newPinAttempts.toString())
        setPinAttempts(newPinAttempts)
        setEnteredPIN("")
        if (newPinAttempts === MAX_PIN_ATTEMPTS - 1) {
          setHelperText(translate("PinScreen.oneAttemptRemaining"))
        } else {
          const attemptsRemaining = MAX_PIN_ATTEMPTS - newPinAttempts
          setHelperText(translate("PinScreen.attemptsRemaining", { attemptsRemaining }))
        }
      } else {
        setHelperText(translate("PinScreen.tooManyAttempts"))
        await logout()
        await sleep(1000)
        navigation.reset({
          index: 0,
          routes: [{ name: "Primary" }],
        })
      }
    }
  }

  const handleCompletedPinForSetPin = (newEnteredPIN: string) => {
    if (previousPIN.length === 0) {
      setPreviousPIN(newEnteredPIN)
      setHelperText(translate("PinScreen.verifyPin"))
      setEnteredPIN("")
    } else {
      verifyPINCodeMathes(newEnteredPIN)
    }
  }

  const addDigit = (digit: string) => {
    if (enteredPIN.length < 4) {
      const newEnteredPIN = enteredPIN + digit
      setEnteredPIN(newEnteredPIN)

      if (newEnteredPIN.length === 4) {
        if (screenPurpose === PinScreenPurpose.AuthenticatePin) {
          handleCompletedPinForAuthenticatePin(newEnteredPIN)
        } else if (screenPurpose === PinScreenPurpose.SetPin) {
          handleCompletedPinForSetPin(newEnteredPIN)
        }
      }
    }
  }

  const verifyPINCodeMathes = async (newEnteredPIN: string) => {
    if (previousPIN === newEnteredPIN) {
      if (await KeyStoreWrapper.setPin(previousPIN)) {
        KeyStoreWrapper.resetPinAttempts()
        navigation.goBack()
      } else {
        returnToSetPin()
        Alert.alert(translate("PinScreen.storePinFailed"))
      }
    } else {
      returnToSetPin()
    }
  }

  const returnToSetPin = () => {
    setPreviousPIN("")
    setHelperText(translate("PinScreen.setPinFailedMatch"))
    setEnteredPIN("")
  }

  const circleComponentForDigit = (digit: number) => {
    return (
      <View style={styles.circleContainer}>
        <View
          style={enteredPIN.length > digit ? styles.filledCircle : styles.emptyCircle}
        />
      </View>
    )
  }

  const buttonComponentForDigit = (digit: string) => {
    return (
      <View style={styles.pinPadButtonContainer}>
        <Button
          buttonStyle={styles.pinPadButton}
          titleStyle={styles.pinPadButtonTitle}
          title={digit}
          onPress={() => addDigit(digit)}
        />
      </View>
    )
  }

  const backgroundColor = isDark ? colors.backgroundSecondary : colors.primary
  
  return (
    <Screen style={styles.container} backgroundColor={backgroundColor}>
      <StatusBar backgroundColor={backgroundColor} barStyle="light-content" />
      <View style={styles.topSpacer} />
      <View style={styles.circles}>
        {circleComponentForDigit(0)}
        {circleComponentForDigit(1)}
        {circleComponentForDigit(2)}
        {circleComponentForDigit(3)}
      </View>
      <View style={styles.helperTextContainer}>
        <Text style={styles.helperText}>{helperText}</Text>
      </View>
      <View style={styles.pinPad}>
        <View style={styles.pinPadRow}>
          {buttonComponentForDigit("1")}
          {buttonComponentForDigit("2")}
          {buttonComponentForDigit("3")}
        </View>
        <View style={styles.pinPadRow}>
          {buttonComponentForDigit("4")}
          {buttonComponentForDigit("5")}
          {buttonComponentForDigit("6")}
        </View>
        <View style={styles.pinPadRow}>
          {buttonComponentForDigit("7")}
          {buttonComponentForDigit("8")}
          {buttonComponentForDigit("9")}
        </View>
        <View style={styles.pinPadRow}>
          <View style={styles.pinPadButtonContainer} />
          {buttonComponentForDigit("0")}
          <View style={styles.pinPadButtonContainer}>
            <Button
              buttonStyle={styles.pinPadButton}
              icon={<Icon name="delete" size={28} color={colors.text} />}
              onPress={() => setEnteredPIN(enteredPIN.slice(0, -1))}
            />
          </View>
        </View>
      </View>
      <View style={styles.bottomSpacer} />
    </Screen>
  )
}
