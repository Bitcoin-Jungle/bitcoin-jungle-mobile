import { RouteProp } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Button, Icon } from "react-native-elements"
import ReactNativeHapticFeedback from "react-native-haptic-feedback"

import useMainQuery from "@app/hooks/use-main-query"
import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { useThemeColor } from "../../theme/useThemeColor"
import { ScreenType } from "../../types/jsx"
import { localized } from "../../utils/btcmap"
import { CaptchaError, submitVerifyLocation } from "../../utils/btcmap-submit"
import { CaptchaField, useCaptcha } from "./captcha-field"

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "verifyLocation">
  route: RouteProp<RootStackParamList, "verifyLocation">
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20 },
    name: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 6,
    },
    intro: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
    },
    question: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 12,
    },
    pillRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    pill: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonSecondary,
      borderWidth: 2,
      borderColor: "transparent",
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      color: colors.buttonSecondaryText,
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
    },
    pillTextActive: {
      color: colors.buttonPrimaryText,
    },
    outdatedLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    outdatedInput: {
      color: colors.text,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      lineHeight: 20,
      minHeight: 90,
      textAlignVertical: "top",
      marginBottom: 20,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginBottom: 20,
    },
    inlineError: {
      color: colors.error,
      fontSize: 13,
      marginBottom: 12,
      marginTop: -8,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 50,
    },
    submitBtnDisabled: {
      opacity: 0.55,
    },
    successContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    successTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 10,
      textAlign: "center",
    },
    successBody: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 32,
    },
    successBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 32,
      height: 50,
    },
  })
}

export const VerifyLocationScreen: ScreenType = ({ navigation, route }: Props) => {
  const { place, current: initialCurrent } = route.params
  const { userPreferredLanguage } = useMainQuery()
  const colors = useThemeColor()
  const styles = useStyles()

  const name = localized(place, "name", userPreferredLanguage) || "—"

  const [current, setCurrent] = React.useState<boolean>(initialCurrent)
  const [outdatedText, setOutdatedText] = React.useState("")
  const [captchaAnswer, setCaptchaAnswer] = React.useState("")
  const [captchaError, setCaptchaError] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [successIssue, setSuccessIssue] = React.useState<number | null>(null)

  const captcha = useCaptcha()

  const handleSubmit = React.useCallback(async () => {
    // Validate captcha
    if (!captchaAnswer.trim()) {
      setCaptchaError(translate("MapScreen.formCaptchaRequired"))
      return
    }
    setCaptchaError(null)
    setSubmitError(null)
    setSubmitting(true)
    try {
      const issueNumber = await submitVerifyLocation({
        captchaSecret: captcha.secret,
        captchaTest: captchaAnswer.trim(),
        place,
        current,
        outdated: outdatedText.trim() || "",
      })
      ReactNativeHapticFeedback.trigger("notificationSuccess", {
        ignoreAndroidSystemSettings: false,
        enableVibrateFallback: true,
      })
      setSuccessIssue(issueNumber)
    } catch (err) {
      if (err instanceof CaptchaError) {
        setCaptchaError(translate("MapScreen.formCaptchaWrong"))
        setCaptchaAnswer("")
        captcha.refresh()
      } else {
        setSubmitError(translate("MapScreen.formError"))
      }
    } finally {
      setSubmitting(false)
    }
  }, [captchaAnswer, captcha, place, current, outdatedText])

  if (successIssue !== null) {
    return (
      <Screen preset="fixed">
        <View style={styles.successContainer}>
          <Icon
            name="checkmark-circle"
            type="ionicon"
            size={72}
            color={colors.success}
          />
          <Text style={styles.successTitle}>
            {translate("MapScreen.formSuccessTitle")}
          </Text>
          <Text style={styles.successBody}>
            {translate("MapScreen.formSuccessBody", { number: String(successIssue) })}
          </Text>
          <Button
            title={translate("common.back")}
            buttonStyle={styles.successBtn}
            onPress={() => navigation.goBack()}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll">
      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.intro}>{translate("MapScreen.verifyIntro")}</Text>

        <Text style={styles.question}>
          {translate("MapScreen.verifyQuestion", { name })}
        </Text>

        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[styles.pill, current && styles.pillActive]}
            onPress={() => setCurrent(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, current && styles.pillTextActive]}>
              {translate("MapScreen.verifyYes")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, !current && styles.pillActive]}
            onPress={() => setCurrent(false)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, !current && styles.pillTextActive]}>
              {translate("MapScreen.verifyNo")}
            </Text>
          </TouchableOpacity>
        </View>

        {!current ? (
          <>
            <Text style={styles.outdatedLabel}>
              {translate("MapScreen.verifyOutdatedLabel")}
            </Text>
            <TextInput
              style={styles.outdatedInput}
              value={outdatedText}
              onChangeText={setOutdatedText}
              placeholder={translate("MapScreen.verifyOutdatedPlaceholder")}
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              autoCorrect={false}
              returnKeyType="default"
            />
          </>
        ) : null}

        <View style={styles.divider} />

        <CaptchaField
          svg={captcha.svg}
          loading={captcha.loading}
          error={captcha.error}
          value={captchaAnswer}
          onChangeText={(v) => {
            setCaptchaAnswer(v)
            if (captchaError) setCaptchaError(null)
          }}
          onRefresh={captcha.refresh}
        />

        {captchaError ? (
          <Text style={styles.inlineError}>{captchaError}</Text>
        ) : null}

        {submitError ? (
          <Text style={styles.inlineError}>{submitError}</Text>
        ) : null}

        <Button
          title={submitting ? translate("MapScreen.formSubmitting") : translate("MapScreen.formSubmit")}
          buttonStyle={styles.submitBtn}
          disabledStyle={styles.submitBtnDisabled}
          disabled={submitting}
          loading={submitting}
          onPress={handleSubmit}
        />
      </View>
    </Screen>
  )
}
