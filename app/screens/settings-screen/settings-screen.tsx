import * as React from "react"
import { Alert, Text, TextStyle } from "react-native"
import Share from "react-native-share"
import { Divider, Icon, ListItem } from "react-native-elements"
import { StackNavigationProp } from "@react-navigation/stack"
import { gql, OperationVariables, QueryLazyOptions, useLazyQuery } from "@apollo/client"
import type { StyleProp, ViewStyle } from 'react-native';
import { Screen } from "../../components/screen"
import { VersionComponent } from "../../components/version"
import { palette } from "../../theme/palette"
import { GALOY_PAY_DOMAIN, WHATSAPP_CONTACT_NUMBER } from "../../constants/support"
import { translate } from "../../i18n"
import KeyStoreWrapper from "../../utils/storage/secureStorage"
import type { ScreenType } from "../../types/jsx"
import type { RootStackParamList } from "../../navigation/stack-param-lists"
import Clipboard from "@react-native-clipboard/clipboard"
import { toastShow } from "../../utils/toast"
import useToken from "../../utils/use-token"
import useLogout from "../../hooks/use-logout"
import useMainQuery from "@app/hooks/use-main-query"
import crashlytics from "@react-native-firebase/crashlytics"
import { openWhatsApp } from "@app/utils/external"

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "settings">
}

export const SettingsScreen: ScreenType = ({ navigation }: Props) => {
  const { hasToken } = useToken()
  const { logout } = useLogout()

  const { btcWalletId, username, phoneNumber, userPreferredLanguage, email } = useMainQuery()

  const securityAction = async () => {
    const isBiometricsEnabled = await KeyStoreWrapper.getIsBiometricsEnabled()
    const isPinEnabled = await KeyStoreWrapper.getIsPinEnabled()
    const isSendLockEnabled = await KeyStoreWrapper.getIsSendLockEnabled()

    navigation.navigate("security", {
      mIsBiometricsEnabled: isBiometricsEnabled,
      mIsPinEnabled: isPinEnabled,
      mIsSendLockEnabled: isSendLockEnabled,
    })
  }

  const lnurlAction = () => {
    if (username) {
      navigation.navigate("lnurl", { username: username })
    } else {
      Alert.alert(
        `Lnurl ${translate("SettingsScreen.title")}`,
        translate("SettingsScreen.lnurlNoUsername"),
        [
          {
            text: translate("common.yes"),
            onPress: () => navigation.navigate("setUsername"),
          },
          {
            text: translate("common.no"),
          },
        ],
      )
    }
  }

  const logoutAction = async () => {
    try {
      Alert.alert(translate("common.logOutAction"), "", [
        {
          text: translate("common.ok"),
          style: "destructive",
          onPress: async () => {
            await logout()
            navigation.goBack()
            Alert.alert(translate("common.loggedOut"))
          }
        },
        {
          text: translate("common.cancel"),
          onPress: () => {
            console.log('cancel')
          }
        }
      ])
    } catch (err) {
      // TODO: figure out why ListItem onPress is swallowing errors
      console.error(err)
    }
  }

  const deleteAction = async () => {
    try {
      Alert.alert(translate("common.accountDeleteConfirm"), "", [
        {
          text: translate("common.ok"),
          style: "destructive",
          onPress: async () => {
            await logout()
            navigation.goBack()
            Alert.alert(translate("common.accountDeleted"))
          }
        },
        {
          text: translate("common.cancel"),
          onPress: () => {
            console.log('cancel')
          }
        }
      ])
    } catch (err) {
      // TODO: figure out why ListItem onPress is swallowing errors
      console.error(err)
    }
  }

  return (
    <SettingsScreenJSX
      hasToken={hasToken}
      navigation={navigation}
      username={username}
      phone={phoneNumber}
      email={email}
      language={translate(`Languages.${userPreferredLanguage || "DEFAULT"}`)}
      securityAction={securityAction}
      logoutAction={logoutAction}
      deleteAction={deleteAction}
      lnurlAction={lnurlAction}
    />
  )
}

type SettingsScreenProps = {
  hasToken: boolean
  navigation: StackNavigationProp<RootStackParamList, "settings">
  username: string
  phone: string
  email: string
  language: string
  notificationsEnabled: boolean
  securityAction: () => void
  logoutAction: () => Promise<void>
  deleteAction: () => Promise<void>
  lnurlAction: () => void
}

type SettingRow = {
  id: string
  icon: string
  category: string
  hidden?: boolean
  enabled?: boolean
  subTitleText?: string
  subTitleDefaultValue?: string
  action?: () => void
  greyed?: boolean
  danger?: boolean
  styleDivider?: StyleProp<ViewStyle>
}

export const SettingsScreenJSX: ScreenType = (params: SettingsScreenProps) => {
  const {
    hasToken,
    navigation,
    username,
    phone,
    email,
    language,
    securityAction,
    logoutAction,
    deleteAction,
    lnurlAction,
  } = params
  const copyToClipBoard = (username) => {
    Clipboard.setString(GALOY_PAY_DOMAIN + username)
    Clipboard.getString().then((data) =>
      toastShow(translate("tippingLink.copied", { data }), {
        backgroundColor: palette.lightBlue,
      }),
    )
  }

  const openWhatsAppAction = () =>
    openWhatsApp(WHATSAPP_CONTACT_NUMBER, translate("whatsapp.defaultSupportMessage"))

  const settingList: SettingRow[] = [
    {
      category: translate("common.phoneNumber"),
      icon: "call",
      id: "phone",
      subTitleDefaultValue: translate("SettingsScreen.tapLogIn"),
      subTitleText: phone,
      action: () => navigation.navigate("phoneValidation"),
      enabled: !hasToken,
      greyed: hasToken,
    },
    {
      category: translate("common.username"),
      icon: "person-circle",
      id: "username",
      subTitleDefaultValue: translate("SettingsScreen.tapUserName"),
      subTitleText: username,
      action: () => navigation.navigate("setUsername"),
      enabled: hasToken && !username,
      greyed: !hasToken || !!(hasToken && username),
    },
    {
      category: translate("SettingsScreen.emailTitle"),
      icon: "mail-outline",
      id: "email",
      subTitleDefaultValue: translate("SettingsScreen.tapEmail"),
      subTitleText: email,
      action: () => navigation.navigate("setEmail"),
      enabled: hasToken && !email,
      greyed: !hasToken || !!(hasToken && email),
    },
    {
      category: translate("common.language"),
      icon: "language",
      id: "language",
      subTitleText: language,
      action: () => navigation.navigate("language"),
      enabled: hasToken,
      greyed: !hasToken,
    },
    {
      category: translate("common.security"),
      icon: "lock-closed-outline",
      id: "security",
      action: securityAction,
      enabled: hasToken,
      greyed: !hasToken,
    },
    {
      category: translate("common.lnurl"),
      icon: "qr-code-outline",
      id: "lnurl",
      action: lnurlAction,
      enabled: hasToken,
      greyed: !hasToken || !username,
    },
    {
      category: translate("TransactionStatsScreen.title"),
      icon: "analytics-outline",
      id: "transactionStats",
      action: () => navigation.navigate("transactionStats"),
      enabled: hasToken,
      greyed: !hasToken,
    },
    {
      category: translate("tippingLink.title"),
      icon: "cash-outline",
      id: "tippingLink",
      action: () => copyToClipBoard(username),
      enabled: hasToken && username !== null,
      greyed: !hasToken || username === null,
    },
    {
      category: translate("AdvancedFeaturesScreen.title"),
      icon: "settings-outline",
      id: "advancedFeatures",
      action: () => navigation.navigate("advancedFeatures"),
      enabled: hasToken,
      greyed: !hasToken,
    },
    {
      category: translate("PointOfSaleScreen.title"),
      icon: "compass-outline",
      id: "pointOfSaleLink",
      action: () => navigation.navigate("pointOfSale"),
      enabled: hasToken && username !== null,
      greyed: !hasToken || username === null,
    },
    {
      category: "SINPE Móvil",
      icon: "sync-outline",
      id: "sinpeLink",
      action: () => navigation.navigate("sinpeScreen"),
      enabled: hasToken && username !== null,
      greyed: !hasToken || username === null,
      hidden: !hasToken || username === null,
    },
    {
      category: translate("whatsapp.contactUs"),
      icon: "logo-whatsapp",
      id: "contact-us",
      action: openWhatsAppAction,
      enabled: true,
      greyed: false,
      styleDivider: { backgroundColor: palette.lighterGrey, height: 18 },
    },
    {
      category: translate("common.logout"),
      id: "log-out",
      icon: "log-out",
      action: () => logoutAction(),
      enabled: hasToken,
      greyed: !hasToken,
      hidden: !hasToken,
    },
    {
      category: translate("common.deleteAccount"),
      id: "deleteAccount",
      icon: "trash-outline",
      action: () => deleteAction(),
      enabled: hasToken,
      greyed: !hasToken,
      hidden: !hasToken,
      danger: true,
    },
  ]

  return (
    <Screen preset="scroll">
      {settingList.map((setting, i) => {
        if (setting.hidden) {
          return null
        }
        const settingColor = setting.greyed ? palette.midGrey : setting.danger ? palette.red : palette.darkGrey
        const settingStyle: TextStyle = { color: settingColor }
        return (
          <React.Fragment key={`setting-option-${i}`}>
            <ListItem onPress={setting.action} disabled={!setting.enabled}>
              <Icon name={setting.icon} type="ionicon" color={settingColor} />
              <ListItem.Content>
                <ListItem.Title style={settingStyle}>
                  <Text>{setting.category}</Text>
                </ListItem.Title>
                {setting.subTitleText && (
                  <ListItem.Subtitle style={settingStyle}>
                    <Text>{setting.subTitleText}</Text>
                  </ListItem.Subtitle>
                )}
              </ListItem.Content>
              {setting.enabled && <ListItem.Chevron />}
            </ListItem>
            <Divider style={setting.styleDivider} />
          </React.Fragment>
        )
      })}
      <VersionComponent />
    </Screen>
  )
}
