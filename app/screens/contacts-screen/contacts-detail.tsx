import { useMutation } from "@apollo/client"
import * as React from "react"
import { Alert, View } from "react-native"
import { Input, Text, Icon } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
// import Icon from "react-native-vector-icons/Ionicons"
import { CloseCross } from "../../components/close-cross"
import { IconTransaction } from "../../components/icon-transactions"
import { LargeButton } from "../../components/large-button"
import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import type { ContactStackParamList } from "../../navigation/stack-param-lists"
import { StackNavigationProp } from "@react-navigation/stack"
import { RouteProp } from "@react-navigation/native"
import type { ScreenType } from "../../types/jsx"
import { ContactTransactionsDataInjected } from "./contact-transactions"
import useMainQuery from "@app/hooks/use-main-query"
import { USER_CONTACT_UPDATE_ALIAS, USER_CONTACT_DELETE } from "../../graphql/contacts"
import { contactIdentityInput } from "./contact-display"
import { toastShow } from "../../utils/toast"
import * as UsernameValidation from "../../utils/validation"
// import { SafeAreaView } from "react-native-safe-area-context"

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
    actionsContainer: { paddingBottom: 18 },

    amount: {
      color: palette.white,
      fontSize: "36rem",
    },

    amountSecondary: {
      color: palette.white,
      fontSize: "16rem",
    },

    amountView: {
      alignItems: "center",
      paddingVertical: "12rem",
    },

    icon: { margin: 0 },

    inputContainer: {
      flexDirection: "row",
    },

    inputStyle: { textAlign: "center", textDecorationLine: "underline" },

    screenTitle: { 
      fontSize: 18, 
      marginBottom: 12, 
      marginTop: 8,
      color: colors.text,
    },
    
    screen: {
      backgroundColor: colors.background,
    },

    transactionsView: {
      flex: 1,
      marginHorizontal: "30rem",
    },
  })
}

type ContactDetailProps = {
  route: RouteProp<ContactStackParamList, "contactDetail">
  navigation: StackNavigationProp<ContactStackParamList, "contactDetail">
}

export const ContactsDetailScreen: ScreenType = ({
  route,
  navigation,
}: ContactDetailProps) => {
  const { contact } = route.params
  const { refetch: refetchMain } = useMainQuery()
  return (
    <ContactsDetailScreenJSX
      navigation={navigation}
      contact={contact}
      refetchMain={refetchMain}
    />
  )
}

type ContactDetailScreenProps = {
  contact: Contact
  navigation: StackNavigationProp<ContactStackParamList, "contactDetail">
  refetchMain: () => void
}

export const ContactsDetailScreenJSX: ScreenType = ({
  contact,
  navigation,
  refetchMain,
}: ContactDetailScreenProps) => {
  const [contactName, setContactName] = React.useState(contact.alias ?? "")
  const styles = useStyles()
  const colors = useThemeColor()

  const contactLabel = contact.username ?? contact.lightningAddress ?? contact.id

  const [updateNameMutation] = useMutation(USER_CONTACT_UPDATE_ALIAS, {
    onCompleted: () => refetchMain(),
  })

  const [deleteContactMutation] = useMutation(USER_CONTACT_DELETE, {
    refetchQueries: ["contacts"],
    onCompleted: () => refetchMain(),
  })

  const updateName = async () => {
    const trimmed = contactName.trim()

    // The field auto-saves on blur, so skip no-op saves: blank, or unchanged from
    // what's already stored (avoids re-submitting an existing alias that may itself
    // predate the ContactAlias rules, e.g. an auto-added lightning address).
    if (trimmed.length === 0 || trimmed === (contact.alias ?? "").trim()) {
      return
    }

    // ContactAlias: starts with a letter, letters/spaces/hyphens/apostrophes, min 4.
    if (!UsernameValidation.isValidContactAlias(trimmed)) {
      toastShow(translate("ContactDetailsScreen.invalidAlias"))
      setContactName(contact.alias ?? "")
      return
    }

    try {
      const { data } = await updateNameMutation({
        variables: { input: { ...contactIdentityInput(contact), alias: trimmed } },
      })
      const errors = data?.userContactUpdateAlias?.errors
      if (errors && errors.length > 0) {
        toastShow(errors[0].message)
        setContactName(contact.alias ?? "")
      }
    } catch (err) {
      toastShow(err.message)
      setContactName(contact.alias ?? "")
    }
  }

  const deleteContact = () => {
    Alert.alert(
      translate("ContactDetailsScreen.deleteTitle"),
      translate("ContactDetailsScreen.deleteMessage", { name: contactName || contactLabel }),
      [
        { text: translate("common.cancel"), style: "cancel" },
        {
          text: translate("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const { data } = await deleteContactMutation({
                variables: { input: contactIdentityInput(contact) },
              })
              const errors = data?.userContactDelete?.errors
              if (errors && errors.length > 0) {
                toastShow(errors[0].message)
                return
              }
              navigation.goBack()
            } catch (err) {
              toastShow(err.message)
            }
          },
        },
      ],
    )
  }

  return (
      <Screen style={styles.screen}>
        <View style={[styles.amountView, { backgroundColor: colors.primary }]}>
          <Icon
            name="person-outline"
            size={86}
            color={palette.white}
            style={styles.icon}
            type="ionicon"
          />
          <View style={styles.inputContainer}>
            <Input
              style={styles.amount}
              inputStyle={styles.inputStyle}
              inputContainerStyle={{ borderColor: colors.primary }}
              onChangeText={setContactName}
              onSubmitEditing={updateName}
              onBlur={updateName}
              returnKeyType="done"
            >
              {contactName}
            </Input>
          </View>
          <Text style={styles.amountSecondary}>{`${translate(
            contact.username ? "common.username" : "common.lightningAddress",
          )}: ${contactLabel}`}</Text>
        </View>
        <View style={styles.transactionsView}>
          <Text style={styles.screenTitle}>
            {translate("ContactDetailsScreen.title", {
              input: contactName || contactLabel,
            })}
          </Text>
          {contact.username ? (
            <ContactTransactionsDataInjected
              navigation={navigation}
              contactUsername={contact.username}
            />
          ) : null}
        </View>
        <View style={styles.actionsContainer}>
          <LargeButton
            title={translate("MoveMoneyScreen.send")}
            icon={<IconTransaction isReceive={false} size={32} />}
            onPress={() =>
              navigation.navigate("sendBitcoin", {
                username: contact.username ?? contact.lightningAddress,
              })
            }
          />
          <LargeButton
            title={translate("ContactDetailsScreen.deleteContact")}
            icon={<Icon name="trash-outline" size={32} color={colors.error} type="ionicon" />}
            onPress={deleteContact}
          />
        </View>
        <CloseCross color={palette.white} onPress={navigation.goBack} />
      </Screen>
  )
}
