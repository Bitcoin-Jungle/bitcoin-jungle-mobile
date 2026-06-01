import { RouteProp } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Button, Icon } from "react-native-elements"
import ReactNativeHapticFeedback from "react-native-haptic-feedback"

import useMainQuery from "@app/hooks/use-main-query"
import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { useThemeColor } from "../../theme/useThemeColor"
import { ScreenType } from "../../types/jsx"
import { localized } from "../../utils/btcmap"
import { reportPlace, verifyPlace } from "../../utils/bj-maps-api"

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "verifyLocation">
  route: RouteProp<RootStackParamList, "verifyLocation">
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    content: { padding: 20 },
    name: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 6 },
    intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 },
    question: { color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 20 },
    label: { color: colors.text, fontSize: 14, fontWeight: "600", marginBottom: 8 },
    input: {
      color: colors.text,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      lineHeight: 20,
      minHeight: 100,
      textAlignVertical: "top",
      marginBottom: 16,
    },
    inlineError: { color: colors.error, fontSize: 13, marginBottom: 12 },
    primaryBtn: { backgroundColor: colors.primary, height: 50, borderRadius: 10 },
    successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
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
    successBtn: { backgroundColor: colors.primary, height: 50, borderRadius: 10, paddingHorizontal: 32 },
  })
}

export const VerifyLocationScreen: ScreenType = ({ navigation, route }: Props) => {
  const { place, mode } = route.params
  const { userPreferredLanguage } = useMainQuery()
  const colors = useThemeColor()
  const styles = useStyles()

  const name = localized(place, "name", userPreferredLanguage) || "—"

  const [description, setDescription] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => {
    navigation.setOptions({
      title:
        mode === "report"
          ? translate("MapScreen.reportModalTitle")
          : translate("MapScreen.verifyTitle"),
    })
  }, [navigation, mode])

  const handleSubmit = async () => {
    setError(null)
    if (mode === "report" && !description.trim()) {
      setError(translate("MapScreen.formReportRequired"))
      return
    }
    setSubmitting(true)
    try {
      if (mode === "report") {
        await reportPlace(place.id, description.trim())
      } else {
        await verifyPlace(place.id, true)
      }
      ReactNativeHapticFeedback.trigger("notificationSuccess", {
        ignoreAndroidSystemSettings: false,
        enableVibrateFallback: true,
      })
      setSubmitted(true)
    } catch {
      setError(translate("MapScreen.formError"))
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Screen preset="fixed">
        <View style={styles.successContainer}>
          <Icon name="checkmark-circle" type="ionicon" size={72} color={colors.success} />
          <Text style={styles.successTitle}>{translate("MapScreen.formSuccessTitle")}</Text>
          <Text style={styles.successBody}>{translate("MapScreen.formSubmittedReview")}</Text>
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.name}>{name}</Text>

        {mode === "report" ? (
          <>
            <Text style={styles.intro}>{translate("MapScreen.reportModalText", { name })}</Text>
            <Text style={styles.label}>{translate("MapScreen.problemDescription")}</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder={translate("MapScreen.verifyOutdatedPlaceholder")}
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </>
        ) : (
          <>
            <Text style={styles.intro}>{translate("MapScreen.verifyIntro")}</Text>
            <Text style={styles.question}>
              {translate("MapScreen.verifyQuestion", { name })}
            </Text>
          </>
        )}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <Button
          title={
            submitting
              ? translate("MapScreen.formSubmitting")
              : mode === "report"
              ? translate("MapScreen.formSubmit")
              : translate("MapScreen.verifyYes")
          }
          buttonStyle={styles.primaryBtn}
          onPress={handleSubmit}
          disabled={submitting}
          loading={submitting}
        />
      </ScrollView>
    </Screen>
  )
}
