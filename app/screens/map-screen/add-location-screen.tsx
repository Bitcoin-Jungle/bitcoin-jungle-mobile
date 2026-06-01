import { RouteProp } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Button, CheckBox, Icon } from "react-native-elements"
import ReactNativeHapticFeedback from "react-native-haptic-feedback"

import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { ScreenType } from "../../types/jsx"
import { useThemeColor } from "../../theme/useThemeColor"
import { CaptchaError, submitAddLocation } from "../../utils/btcmap-submit"
import { CaptchaField, useCaptcha } from "./captcha-field"

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "addLocation">
  route: RouteProp<RootStackParamList, "addLocation">
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    intro: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      color: colors.text,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      height: 44,
      fontSize: 15,
      marginBottom: 16,
    },
    inputMultiline: {
      color: colors.text,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      marginBottom: 16,
      minHeight: 80,
      textAlignVertical: "top",
    },
    checkboxContainer: {
      backgroundColor: "transparent",
      borderWidth: 0,
      padding: 0,
      marginLeft: 0,
      marginRight: 0,
      marginBottom: 4,
    },
    checkboxText: {
      color: colors.text,
      fontWeight: "400",
      fontSize: 15,
    },
    methodsBlock: { marginBottom: 16 },
    captchaSection: { marginBottom: 16 },
    errorText: {
      color: colors.error,
      fontSize: 13,
      marginBottom: 12,
    },
    submitBtn: { backgroundColor: colors.primary },
    successContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    successTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 12,
      textAlign: "center",
    },
    successBody: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 32,
    },
    backBtn: { backgroundColor: colors.primary, paddingHorizontal: 32 },
  })
}

export const AddLocationScreen: ScreenType = ({ navigation, route }: Props) => {
  const styles = useStyles()
  const colors = useThemeColor()
  const params = (route as Props["route"]).params

  // Form fields
  const [name, setName] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [lightning, setLightning] = React.useState(false)
  const [onchain, setOnchain] = React.useState(false)
  const [nfc, setNfc] = React.useState(false)
  const [website, setWebsite] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [hours, setHours] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [contact, setContact] = React.useState("")

  // Captcha
  const { svg, secret, loading: captchaLoading, error: captchaError, refresh } = useCaptcha()
  const [captchaAnswer, setCaptchaAnswer] = React.useState("")

  // Submit state
  const [submitting, setSubmitting] = React.useState(false)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [successNumber, setSuccessNumber] = React.useState<number | null>(null)

  const handleSubmit = async () => {
    setFieldError(null)

    if (!name.trim()) {
      setFieldError(translate("MapScreen.formNameRequired"))
      return
    }
    if (!captchaAnswer.trim()) {
      setFieldError(translate("MapScreen.formCaptchaRequired"))
      return
    }

    const methods: ("lightning" | "onchain" | "nfc")[] = []
    if (lightning) methods.push("lightning")
    if (onchain) methods.push("onchain")
    if (nfc) methods.push("nfc")

    setSubmitting(true)
    try {
      const issueNumber = await submitAddLocation({
        captchaSecret: secret,
        captchaTest: captchaAnswer,
        name: name.trim(),
        address: address.trim() || undefined,
        lat: params?.lat,
        long: params?.long,
        category: category.trim() || undefined,
        methods: methods.length > 0 ? methods : undefined,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
        hours: hours.trim() || undefined,
        notes: notes.trim() || undefined,
        contact: contact.trim() || undefined,
      })
      ReactNativeHapticFeedback.trigger("notificationSuccess", {
        ignoreAndroidSystemSettings: false,
        enableVibrateFallback: true,
      })
      setSuccessNumber(issueNumber)
    } catch (err) {
      if (err instanceof CaptchaError) {
        setFieldError(translate("MapScreen.formCaptchaWrong"))
        setCaptchaAnswer("")
        refresh()
      } else {
        setFieldError(translate("MapScreen.formError"))
      }
      setSubmitting(false)
    }
  }

  if (successNumber !== null) {
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
            {translate("MapScreen.formSuccessBody", { number: successNumber })}
          </Text>
          <Button
            title={translate("common.back")}
            buttonStyle={styles.backBtn}
            onPress={() => (navigation as Props["navigation"]).goBack()}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          {translate("MapScreen.addLocationIntro")}
        </Text>

        {/* Name (required) */}
        <Text style={styles.label}>{translate("MapScreen.fieldName")} *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Address */}
        <Text style={styles.label}>{translate("MapScreen.fieldAddress")}</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Category */}
        <Text style={styles.label}>{translate("MapScreen.fieldCategory")}</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Payment methods */}
        <Text style={styles.label}>{translate("MapScreen.fieldPaymentMethods")}</Text>
        <View style={styles.methodsBlock}>
          <CheckBox
            title={translate("MapScreen.payLightning")}
            checked={lightning}
            onPress={() => setLightning((v) => !v)}
            containerStyle={styles.checkboxContainer}
            textStyle={styles.checkboxText}
            checkedColor={colors.primary}
          />
          <CheckBox
            title={translate("MapScreen.payOnchain")}
            checked={onchain}
            onPress={() => setOnchain((v) => !v)}
            containerStyle={styles.checkboxContainer}
            textStyle={styles.checkboxText}
            checkedColor={colors.primary}
          />
          <CheckBox
            title={translate("MapScreen.payNfc")}
            checked={nfc}
            onPress={() => setNfc((v) => !v)}
            containerStyle={styles.checkboxContainer}
            textStyle={styles.checkboxText}
            checkedColor={colors.primary}
          />
        </View>

        {/* Website */}
        <Text style={styles.label}>{translate("MapScreen.fieldWebsite")}</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholderTextColor={colors.placeholder}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        {/* Phone */}
        <Text style={styles.label}>{translate("MapScreen.fieldPhone")}</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        {/* Hours */}
        <Text style={styles.label}>{translate("MapScreen.fieldHours")}</Text>
        <TextInput
          style={styles.input}
          value={hours}
          onChangeText={setHours}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          returnKeyType="next"
        />

        {/* Notes */}
        <Text style={styles.label}>{translate("MapScreen.fieldNotes")}</Text>
        <TextInput
          style={styles.inputMultiline}
          value={notes}
          onChangeText={setNotes}
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={3}
        />

        {/* Contact */}
        <Text style={styles.label}>{translate("MapScreen.fieldContact")}</Text>
        <TextInput
          style={styles.input}
          value={contact}
          onChangeText={setContact}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />

        {/* Captcha */}
        <View style={styles.captchaSection}>
          <CaptchaField
            svg={svg}
            loading={captchaLoading}
            error={captchaError}
            value={captchaAnswer}
            onChangeText={setCaptchaAnswer}
            onRefresh={refresh}
          />
        </View>

        {/* Inline error */}
        {fieldError ? (
          <Text style={styles.errorText}>{fieldError}</Text>
        ) : null}

        {/* Submit */}
        <Button
          title={submitting ? translate("MapScreen.formSubmitting") : translate("MapScreen.formSubmit")}
          buttonStyle={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
          loading={submitting}
        />
      </ScrollView>
    </Screen>
  )
}
