import { RouteProp } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Button, Icon } from "react-native-elements"
import ReactNativeHapticFeedback from "react-native-haptic-feedback"

import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { MerchantCategory } from "../../types/btcmap"
import { useThemeColor } from "../../theme/useThemeColor"
import { ScreenType } from "../../types/jsx"
import { categoryLabelKey } from "../../utils/btcmap"
import { submitPlace } from "../../utils/bj-maps-api"

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "addLocation">
  route: RouteProp<RootStackParamList, "addLocation">
}

const CATEGORIES: { key: MerchantCategory; icon: string }[] = [
  { key: "restaurant", icon: "restaurant-outline" },
  { key: "cafe", icon: "cafe-outline" },
  { key: "hotel", icon: "bed-outline" },
  { key: "retail", icon: "bag-outline" },
  { key: "tourism", icon: "compass-outline" },
  { key: "health", icon: "medkit-outline" },
  { key: "services", icon: "briefcase-outline" },
  { key: "transport", icon: "car-outline" },
  { key: "other", icon: "pin-outline" },
]

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 },
    label: { color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 4 },
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
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      height: 48,
      marginBottom: 16,
    },
    locationText: { flex: 1, color: colors.text, fontSize: 15, marginLeft: 10 },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: colors.buttonSecondary,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.buttonSecondaryText, fontSize: 13, marginLeft: 4 },
    chipTextActive: { color: colors.buttonPrimaryText },
    errorText: { color: colors.error, fontSize: 13, marginBottom: 12 },
    submitBtn: { backgroundColor: colors.primary, height: 50, borderRadius: 10 },
    successContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
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
    backBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, height: 50, borderRadius: 10 },
  })
}

export const AddLocationScreen: ScreenType = ({ navigation, route }: Props) => {
  const styles = useStyles()
  const colors = useThemeColor()
  const params = route.params

  const [name, setName] = React.useState("")
  const [categories, setCategories] = React.useState<Set<MerchantCategory>>(new Set())
  const [website, setWebsite] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [picked, setPicked] = React.useState<{ latitude: number; longitude: number } | null>(null)

  const [submitting, setSubmitting] = React.useState(false)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState(false)

  const openPicker = () => {
    navigation.navigate("locationPicker", {
      initial: picked ?? params?.region,
      onPicked: setPicked,
    })
  }

  const toggleCategory = (c: MerchantCategory) =>
    setCategories((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })

  const handleSubmit = async () => {
    setFieldError(null)
    if (!name.trim()) {
      setFieldError(translate("MapScreen.formNameRequired"))
      return
    }
    if (!picked) {
      setFieldError(translate("MapScreen.locationRequired"))
      return
    }
    if (categories.size === 0) {
      setFieldError(translate("MapScreen.formCategoryRequired"))
      return
    }

    setSubmitting(true)
    try {
      await submitPlace({
        name: name.trim(),
        coordinates: picked,
        categories: Array.from(categories),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      })
      ReactNativeHapticFeedback.trigger("notificationSuccess", {
        ignoreAndroidSystemSettings: false,
        enableVibrateFallback: true,
      })
      setSubmitted(true)
    } catch {
      setFieldError(translate("MapScreen.formError"))
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
            buttonStyle={styles.backBtn}
            onPress={() => navigation.goBack()}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>{translate("MapScreen.addLocationIntro")}</Text>

        <Text style={styles.label}>{translate("MapScreen.fieldName")} *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>{translate("MapScreen.pickLocationTitle")} *</Text>
        <TouchableOpacity style={styles.locationRow} onPress={openPicker}>
          <Icon
            name={picked ? "checkmark-circle" : "location-outline"}
            type="ionicon"
            size={20}
            color={picked ? colors.success : colors.primary}
          />
          <Text style={styles.locationText}>
            {picked
              ? `${translate("MapScreen.locationSet")} (${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)})`
              : translate("MapScreen.pickLocationCta")}
          </Text>
          <Icon name="chevron-forward" type="ionicon" size={18} color={colors.iconDefault} />
        </TouchableOpacity>

        <Text style={styles.label}>{translate("MapScreen.fieldCategory")} *</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => {
            const active = categories.has(c.key)
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleCategory(c.key)}
              >
                <Icon
                  name={c.icon}
                  type="ionicon"
                  size={14}
                  color={active ? colors.buttonPrimaryText : colors.buttonSecondaryText}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {translate(categoryLabelKey(c.key))}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.label}>{translate("MapScreen.fieldPhone")}</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        <Text style={styles.label}>{translate("MapScreen.fieldWebsite")}</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="next"
        />

        <Text style={styles.label}>{translate("MapScreen.fieldNotes")}</Text>
        <TextInput
          style={styles.inputMultiline}
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={colors.placeholder}
          multiline
        />

        {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}

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
