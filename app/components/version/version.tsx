import { useNavigation } from "@react-navigation/native"
import * as React from "react"
import { Pressable, StyleSheet, Text } from "react-native"
import VersionNumber from "react-native-version-number"
import { translate } from "../../i18n"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { TextStyleProp } from "react-native/Libraries/StyleSheet/StyleSheet"
import type { ComponentType } from "../../types/jsx"
import type { RootStackParamList } from "../../navigation/stack-param-lists"

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    version: {
      color: colors.textSecondary,
      fontSize: 18,
      marginTop: 18,
      textAlign: "center",
    },
  })
}

type VersionComponentNavigationProp = StackNavigationProp<
  RootStackParamList,
  "getStarted" | "settings"
>

export const VersionComponent: ComponentType = ({ style }: { style?: TextStyleProp }) => {
  const { navigate } = useNavigation<VersionComponentNavigationProp>()
  const styles = useStyles()

  const [secretMenuCounter, setSecretMenuCounter] = React.useState(0)
  React.useEffect(() => {
    if (secretMenuCounter > 2) {
      navigate("Profile")
      setSecretMenuCounter(0)
    }
  }, [navigate, secretMenuCounter])

  return (
    <Pressable onPress={() => setSecretMenuCounter(secretMenuCounter + 1)}>
      <Text style={[styles.version, style]}>
        v{VersionNumber.appVersion} build {VersionNumber.buildVersion}
        {"\n"}
        {/* network: {Config.BITCOIN_NETWORK} TODO */}
        {/* FIXME should be a props */}
        {translate("GetStartedScreen.headline")}
      </Text>
    </Pressable>
  )
}
