import { useMutation } from "@apollo/client"
import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { useState } from "react"
import { View } from "react-native"
import { Button, Input, Text } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
import { utils } from "lnurl-pay"

import { CloseCross } from "../../components/close-cross"
import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import type { ContactStackParamList } from "../../navigation/stack-param-lists"
import { useThemeColor } from "../../theme/useThemeColor"
import type { ScreenType } from "../../types/jsx"
import { USER_CONTACT_ADD, CONTACTS } from "../../graphql/contacts"
import * as UsernameValidation from "../../utils/validation"

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
    screen: { backgroundColor: colors.background },

    container: { marginHorizontal: "24rem", marginTop: "24rem" },

    title: { color: colors.text, fontSize: 22, fontWeight: "bold", marginBottom: 16 },

    label: { color: colors.text, fontSize: 14, marginTop: 12 },

    inputContainer: { borderColor: colors.textSecondary },

    inputText: { color: colors.text },

    errorText: { color: colors.error, marginTop: 8 },

    button: { backgroundColor: colors.primary, marginTop: "24rem" },
  })
}

type Props = {
  navigation: StackNavigationProp<ContactStackParamList, "addContact">
}

export const AddContactScreen: ScreenType = ({ navigation }: Props) => {
  const styles = useStyles()
  const colors = useThemeColor()

  const [identifier, setIdentifier] = useState("")
  const [alias, setAlias] = useState("")
  const [error, setError] = useState("")

  const [userContactAddMutation, { loading }] = useMutation(USER_CONTACT_ADD, {
    refetchQueries: [{ query: CONTACTS }],
  })

  const onSubmit = async () => {
    setError("")
    const trimmed = identifier.trim()
    if (!trimmed) {
      setError(translate("AddContactScreen.identifierRequired"))
      return
    }

    // Exactly one of username / lightningAddress. Lightning addresses are
    // normalized lowercase to match the backend; usernames validated locally.
    let identity: { username: string } | { lightningAddress: string }
    if (utils.isLightningAddress(trimmed)) {
      identity = { lightningAddress: trimmed.toLowerCase() }
    } else if (UsernameValidation.isValid(trimmed)) {
      identity = { username: trimmed }
    } else {
      setError(translate("AddContactScreen.invalidIdentifier"))
      return
    }

    const trimmedAlias = alias.trim()
    if (trimmedAlias && !UsernameValidation.isValidContactAlias(trimmedAlias)) {
      setError(translate("AddContactScreen.invalidAlias"))
      return
    }
    const input = trimmedAlias ? { ...identity, alias: trimmedAlias } : identity
    const isUsername = "username" in identity

    // The backend's error for a non-existent/invalid username is often unhelpful
    // (it just echoes the username). Fall back to a clear, kind-specific message
    // unless the backend gave us something genuinely different.
    const friendlyError = (raw?: string): string => {
      const msg = (raw ?? "").trim()
      if (!msg || msg.toLowerCase() === trimmed.toLowerCase()) {
        return translate(
          isUsername
            ? "AddContactScreen.usernameNotFound"
            : "AddContactScreen.addFailed",
        )
      }
      return msg
    }

    try {
      const { data } = await userContactAddMutation({ variables: { input } })
      const errors = data?.userContactAdd?.errors
      if (errors && errors.length > 0) {
        setError(friendlyError(errors[0].message))
        return
      }
      navigation.goBack()
    } catch (err) {
      setError(friendlyError(err.message))
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>{translate("AddContactScreen.title")}</Text>

        <Text style={styles.label}>{translate("AddContactScreen.identifierLabel")}</Text>
        <Input
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={translate("AddContactScreen.identifierPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          inputContainerStyle={styles.inputContainer}
          inputStyle={styles.inputText}
        />

        <Text style={styles.label}>{translate("AddContactScreen.aliasLabel")}</Text>
        <Input
          value={alias}
          onChangeText={setAlias}
          placeholder={translate("AddContactScreen.aliasPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          inputContainerStyle={styles.inputContainer}
          inputStyle={styles.inputText}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title={translate("AddContactScreen.save")}
          buttonStyle={styles.button}
          loading={loading}
          onPress={onSubmit}
        />
      </View>
      <CloseCross color={colors.text} onPress={navigation.goBack} />
    </Screen>
  )
}
