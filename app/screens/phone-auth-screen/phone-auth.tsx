/* eslint-disable react-native/no-inline-styles */
import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { Button, Input } from "react-native-elements"
import { FetchResult, gql, useApolloClient, useMutation } from "@apollo/client"
import EStyleSheet from "react-native-extended-stylesheet"
import PhoneInput from "react-native-phone-number-input"
import analytics from "@react-native-firebase/analytics"
import { StackNavigationProp } from "@react-navigation/stack"
import { RouteProp } from "@react-navigation/native"
import CheckBox from '@react-native-community/checkbox';

import { CloseCross } from "../../components/close-cross"
import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { color } from "../../theme"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import { useTheme } from "../../theme/theme-context"
import useToken from "../../utils/use-token"
import { toastShow } from "../../utils/toast"
import { addDeviceToken } from "../../utils/notifications"
import BiometricWrapper from "../../utils/biometricAuthentication"
import type { ScreenType } from "../../types/jsx"
import { AuthenticationScreenPurpose } from "../../utils/enum"
import BadgerPhone from "./badger-phone-01.svg"
import type { PhoneValidationStackParamList } from "../../navigation/stack-param-lists"
import { parseTimer } from "../../utils/timer"
import { useGeetestCaptcha } from "../../hooks"
import { networkVar } from "../../graphql/client-only-query"
import { requestPermission } from "../../utils/notifications"
// Removed SafeAreaView here; Screen component already applies safe area handling

export const DEFAULT_THEME = {
  primaryColor: '#ccc',
  primaryColorVariant: '#eee',
  backgroundColor: '#ffffff',
  onBackgroundTextColor: '#000000',
  fontSize: 16,
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: 'Arial'
  }),
  filterPlaceholderTextColor: '#aaa',
  activeOpacity: 0.5,
  // itemHeight: getHeightPercent(7),
  flagSize: Platform.select({ android: 20, default: 30 }),
  flagSizeButton: Platform.select({ android: 20, default: 30 })
}
export const DARK_THEME = {
  ...DEFAULT_THEME,
  primaryColor: '#222',
  primaryColorVariant: '#444',
  backgroundColor: '#000',
  onBackgroundTextColor: '#fff'
}

const phoneRegex = new RegExp("^\\+[0-9]+$")

const REQUEST_AUTH_CODE = gql`
  mutation captchaRequestAuthCode($input: CaptchaRequestAuthCodeInput!) {
    captchaRequestAuthCode(input: $input) {
      errors {
        message
      }
      success
    }
  }
`

const LOGIN = gql`
  mutation userLogin($input: UserLoginInput!) {
    userLogin(input: $input) {
      errors {
        message
      }
      authToken
    }
  }
`

type UserLoginMutationResponse = {
  errors: MutationError[]
  authToken?: string
}

type LoginMutationFunction = (
  params,
) => Promise<FetchResult<Record<string, UserLoginMutationResponse>>>

const styles = EStyleSheet.create({
  authCodeEntryContainer: {
    borderColor: color.palette.darkGrey,
    borderRadius: 5,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: "50rem",
    marginVertical: "18rem",
    paddingHorizontal: "18rem",
    paddingVertical: "12rem",
  },

  buttonResend: {
    alignSelf: "center",
    backgroundColor: color.palette.blue,
    width: "200rem",
  },

  buttonContinue: {
    alignSelf: "center",
    backgroundColor: color.palette.blue,
    width: "200rem",
    marginVertical: "15rem",
    padding: "15rem",
  },

  codeContainer: {
    alignSelf: "center",
    width: "70%",
  },

  image: {
    alignSelf: "center",
    marginBottom: "30rem",
    resizeMode: "center",
  },

  phoneEntryContainer: {
    borderColor: color.palette.darkGrey,
    borderRadius: 5,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: "40rem",
    marginVertical: "18rem",
  },

  sendAgainButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: "25rem",
    textAlign: "center",
  },

  text: {
    color: color.palette.darkGrey,
    fontSize: "20rem",
    paddingBottom: "10rem",
    paddingHorizontal: "40rem",
    textAlign: "center",
  },

  textContainer: {
    backgroundColor: "transparent",
  },

  textDisabledSendAgain: {
    color: color.palette.midGrey,
  },

  textEntry: {
    color: color.palette.darkGrey,
    fontSize: "16rem",
  },

  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: "25rem",
    textAlign: "center",
  },

  whatsappRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingHorizontal: "50rem",
    textAlign: "center",
  },
})

type WelcomePhoneInputScreenProps = {
  navigation: StackNavigationProp<PhoneValidationStackParamList, "welcomePhoneInput">
}

export const WelcomePhoneInputScreen: ScreenType = ({
  navigation,
}: WelcomePhoneInputScreenProps) => {
  const {
    geetestError,
    geetestValidationData,
    loadingRegisterCaptcha,
    registerCaptcha,
    resetError,
    resetValidationData,
  } = useGeetestCaptcha()

  const [phoneNumber, setPhoneNumber] = useState("")
  const [whatsapp, setWhatsApp] = useState(false)

  const phoneInputRef = useRef<PhoneInput | null>(null)

  const [requestPhoneCode, { loading: loadingRequestPhoneCode }] = useMutation(
    REQUEST_AUTH_CODE,
    {
      fetchPolicy: "no-cache",
    },
  )

  const setPhone = (newPhoneNumber: string) => {
    setPhoneNumber(newPhoneNumber)
  }

  // This bypasses the captcha for local dev
  // Comment it out to test captcha locally
  useEffect(() => {
    if (phoneNumber) {
      if (networkVar() === "regtest") {
        navigation.navigate("welcomePhoneValidation", { phone: phoneNumber, setPhone })
        setPhoneNumber("")
      } else {
        registerCaptcha()
      }
    }
  }, [navigation, phoneNumber, registerCaptcha])

  const sendRequestAuthCode = useCallback(async () => {
    try {
      const input = {
        phone: phoneNumber,
        whatsapp: whatsapp,
        challengeCode: geetestValidationData?.geetestChallenge,
        validationCode: geetestValidationData?.geetestValidate,
        secCode: geetestValidationData?.geetestSecCode,
      }
      resetValidationData()

      const { data } = await requestPhoneCode({ variables: { input } })

      if (data.captchaRequestAuthCode.success) {
        navigation.navigate("welcomePhoneValidation", { phone: phoneNumber, setPhone })
        setPhoneNumber("")
      } else if (data.captchaRequestAuthCode.errors.length > 0) {
        const errorMessage = data.captchaRequestAuthCode.errors[0].message
        if (errorMessage === "Too many requests") {
          toastShow(translate("errors.tooManyRequestsPhoneCode"))
        } else {
          toastShow(errorMessage)
        }
      } else {
        toastShow(translate("errors.generic"))
      }
    } catch (err) {
      console.warn({ err })
      if (err.message === "Too many requests") {
        toastShow(translate("errors.tooManyRequestsPhoneCode"))
      } else {
        toastShow(translate("errors.generic"))
      }
    }
  }, [
    geetestValidationData,
    navigation,
    phoneNumber,
    requestPhoneCode,
    resetValidationData,
  ])

  useEffect(() => {
    if (
      geetestValidationData?.geetestValidate &&
      geetestValidationData?.geetestChallenge &&
      geetestValidationData?.geetestSecCode
    ) {
      sendRequestAuthCode()
    }
  }, [geetestValidationData, sendRequestAuthCode])

  useEffect(() => {
    if (geetestError) {
      const error = geetestError
      resetError()
      toastShow(error)
    }
  })

  const submitPhoneNumber = () => {
    const phone = phoneInputRef.current.state.number

    const formattedNumber = phoneInputRef.current.getNumberAfterPossiblyEliminatingZero()

    const cleanFormattedNumber = formattedNumber.formattedNumber.replace(/[^\d+]/g, "")

    if (
      !phoneInputRef.current.isValidNumber(phone) ||
      !phoneRegex.test(cleanFormattedNumber)
    ) {
      Alert.alert(`${phone} ${translate("errors.invalidPhoneNumber")}`)
      return
    }

    setPhoneNumber(cleanFormattedNumber)
  }

  const showCaptcha = phoneNumber.length > 0
  let captchaContent: React.ReactNode

  if (loadingRegisterCaptcha || loadingRequestPhoneCode) {
    captchaContent = <ActivityIndicator size="large" color={color.primary} />
  } else {
    captchaContent = null
  }

  const colors = useThemeColor()
  const { isDark } = useTheme()
  return (
      <Screen backgroundColor={colors.background} preset="scroll">
        <View style={{ flex: 1, justifyContent: "flex-start", paddingTop: 16 }}>
          <View>
            <BadgerPhone style={styles.image} />
            <Text style={[styles.text, { color: colors.text }] }>
              {showCaptcha
                ? translate("WelcomePhoneInputScreen.headerVerify")
                : translate("WelcomePhoneInputScreen.header")}
            </Text>
          </View>
          {showCaptcha ? (
            captchaContent
          ) : (
            <KeyboardAvoidingView>
              <PhoneInput
                ref={phoneInputRef}
                value={phoneNumber}
                containerStyle={[styles.phoneEntryContainer, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                textInputStyle={[styles.textEntry, { color: colors.text }]}
                textContainerStyle={[styles.textContainer, { backgroundColor: colors.inputBackground }]}
                codeTextStyle={{ marginLeft: -25, color: colors.text }}
                flagButtonStyle={{ backgroundColor: colors.inputBackground }}
                withDarkTheme={isDark}
                defaultValue={phoneNumber}
                defaultCode="CR"
                layout="first"
                textInputProps={{
                  placeholder: translate("WelcomePhoneInputScreen.placeholder"),
                  placeholderTextColor: colors.placeholder,
                  returnKeyType: loadingRequestPhoneCode ? "default" : "done",
                  onSubmitEditing: submitPhoneNumber,
                  keyboardType: "phone-pad",
                  textContentType: "telephoneNumber",
                  accessibilityLabel: "Input phone number",
                }}
                countryPickerProps={{
                  withFilter: true,
                  withFlag: true,
                  withCountryNameButton: false,
                  withAlphaFilter: false,
                  theme: isDark ? DARK_THEME : DEFAULT_THEME,
                  modalProps: {
                    testID: "country-picker",
                  },
                }}
                autoFocus
              />
              <View style={styles.whatsappRow}>
                <Pressable onPress={() => setWhatsApp(!whatsapp)}>
                  <Text style={{ color: colors.text }}>
                    {translate("WelcomePhoneInputScreen.whatsapp")}
                  </Text>
                </Pressable>
                <CheckBox
                  tintColors={{
                    true: colors.primary,
                    false: colors.text
                  }}
                  style={{marginLeft: 8}}
                  value={whatsapp}
                  onValueChange={(newValue) => setWhatsApp(newValue)}
                />
              </View>
          <ActivityIndicator animating={loadingRequestPhoneCode} size="large" color={colors.primary} style={{ marginTop: 32 }} />
            </KeyboardAvoidingView>
          )}
          <Button
            buttonStyle={[styles.buttonContinue, { backgroundColor: colors.primary }]}
            title={translate("WelcomePhoneInputScreen.continue")}
            disabled={phoneNumber ? true : false}
            onPress={() => {
              submitPhoneNumber()
            }}
          />
        </View>
        <CloseCross color={colors.text} onPress={() => navigation.goBack()} />
      </Screen>
  )
}

type WelcomePhoneValidationScreenDataInjectedProps = {
  navigation: StackNavigationProp<PhoneValidationStackParamList, "welcomePhoneValidation">
  route: RouteProp<PhoneValidationStackParamList, "welcomePhoneValidation">
}

export const WelcomePhoneValidationScreenDataInjected: ScreenType = ({
  route,
  navigation,
}: WelcomePhoneValidationScreenDataInjectedProps) => {
  const { saveToken, hasToken } = useToken()

  const [login, { loading, error }] = useMutation(LOGIN, {
    fetchPolicy: "no-cache",
    onCompleted: async (data) => {
      if (data.userLogin.authToken) {
        if (await BiometricWrapper.isSensorAvailable()) {
          navigation.replace("authentication", {
            screenPurpose: AuthenticationScreenPurpose.TurnOnAuthentication,
          })
        } else {
          navigation.navigate("Primary")
        }
      }
    },
  })

  return (
    <WelcomePhoneValidationScreen
      route={route}
      navigation={navigation}
      login={login}
      loading={loading || hasToken}
      // Todo: provide specific translated error messages in known cases
      error={error?.message ? translate("errors.generic") + error.message : ""}
      saveToken={saveToken}
    />
  )
}

type WelcomePhoneValidationScreenProps = {
  login: LoginMutationFunction
  navigation: StackNavigationProp<PhoneValidationStackParamList, "welcomePhoneValidation">
  route: RouteProp<PhoneValidationStackParamList, "welcomePhoneValidation">
  loading: boolean
  error: string
  saveToken: (string) => Promise<boolean>
}

export const WelcomePhoneValidationScreen: ScreenType = ({
  route,
  navigation,
  loading,
  login,
  error,
  saveToken,
}: WelcomePhoneValidationScreenProps) => {
  const colors = useThemeColor()
  const client = useApolloClient()
  const [code, setCode] = useState("")
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60)

  const { phone } = route.params
  const updateCode = (input) => setCode(input)
  const inputRef = useRef<TextInput | null>(null)

  useEffect(() => {
    setTimeout(() => inputRef?.current?.focus(), 150)
  }, [])

  const send = async () => {
    if (code.length !== 6) {
      toastShow(translate("WelcomePhoneValidationScreen.need6Digits"))
      return
    }

    try {
      const { data } = await login({
        variables: { input: { phone, code: code } },
      })

      // TODO: validate token
      const token = data?.userLogin?.authToken

      if (token) {
        analytics().logLogin({ method: "phone" })
        await saveToken(token)
        await requestPermission(client)
      } else {
        toastShow(translate("WelcomePhoneValidationScreen.errorLoggingIn"))
      }
    } catch (err) {
      console.warn({ err })
      toastShow(`${err}`)
    }
  }

  useEffect(() => {
    if (code.length === 6) {
      send()
    }
  }, [code])

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (secondsRemaining > 0) {
        setSecondsRemaining(secondsRemaining - 1)
      }
    }, 1000)
    return () => clearTimeout(timerId)
  }, [secondsRemaining])

  return (
    <Screen backgroundColor={colors.background}>
      <View style={{ flex: 1 }}>
        <ScrollView>
          <View style={{ flex: 1, minHeight: 32 }} />
          <Text style={[styles.text, { color: colors.text }] }>
            {translate("WelcomePhoneValidationScreen.header", { phone })}
          </Text>
          <KeyboardAvoidingView
            keyboardVerticalOffset={-110}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Input
              ref={inputRef}
              errorStyle={{ color: palette.red }}
              errorMessage={error}
              autoFocus={true}
              style={[styles.authCodeEntryContainer, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
              containerStyle={styles.codeContainer}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.placeholder}
              onChangeText={updateCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              placeholder={translate("WelcomePhoneValidationScreen.placeholder")}
              returnKeyType={loading ? "default" : "done"}
              maxLength={6}
              onSubmitEditing={send}
            >
              {code}
            </Input>
            {secondsRemaining > 0 ? (
              <View style={styles.timerRow}>
                <Text style={[styles.textDisabledSendAgain, { color: colors.textSecondary }]}>
                  {translate("WelcomePhoneValidationScreen.sendAgain")}
                </Text>
                <Text style={{ color: colors.text }}>{parseTimer(secondsRemaining)}</Text>
              </View>
            ) : (
              <View style={styles.sendAgainButtonRow}>
                <Button
                  buttonStyle={[styles.buttonResend, { backgroundColor: colors.primary }]}
                  title={translate("WelcomePhoneValidationScreen.sendAgain")}
                  onPress={() => {
                    if (!loading) {
                      route.params?.setPhone(phone)
                      navigation.goBack()
                    }
                  }}
                />
              </View>
            )}
          </KeyboardAvoidingView>
          <View style={{ flex: 1, minHeight: 16 }} />
          <ActivityIndicator animating={loading} size="large" color={colors.primary} />
          <View style={{ flex: 1 }} />
        </ScrollView>
      </View>
    </Screen>
  )
}
