import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { Image, View } from "react-native"
import { Button } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
import { Screen } from "../../components/screen"
import { VersionComponent } from "../../components/version"
import { translate } from "../../i18n"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { color } from "../../theme"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import type { ScreenType } from "../../types/jsx"

import BitcoinJungleLogo from "./BitcoinJungleLogo.png"

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
    Logo: {
      marginTop: 24,
      maxHeight: "50%",
      maxWidth: "85%",
    },

    bottom: {
      alignItems: "center",
      flex: 1,
      justifyContent: "flex-end",
      marginBottom: 36,
      width: "100%",
    },

    button: {
      backgroundColor: colors.primary,
      borderRadius: 24,
    },

    buttonContainer: {
      marginVertical: 12,
      width: "80%",
    },

    buttonTitle: {
      color: colors.buttonPrimaryText,
      fontWeight: "bold",
    },

    container: {
      alignItems: "center",
      flex: 1,
      width: "100%",
    },

    version: { paddingTop: 18 },
  })
}

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "getStarted">
}

export const GetStartedScreen: ScreenType = ({ navigation }: Props) => {
  const colors = useThemeColor()
  const styles = useStyles()
  return (
  <Screen
    style={styles.container}
    backgroundColor={colors.backgroundSecondary}
    statusBar={colors.text === palette.white ? "light-content" : "dark-content"}
  >
    <Image style={styles.Logo} source={BitcoinJungleLogo} resizeMode="contain" />
    <VersionComponent style={styles.version} />
    <View style={styles.bottom}>
      <Button
        title={translate("GetStartedScreen.getStarted")}
        buttonStyle={styles.button}
        titleStyle={styles.buttonTitle}
        onPress={() => navigation.replace("welcomeFirst")}
        containerStyle={styles.buttonContainer}
        testID="getStarted"
      />
    </View>
  </Screen>
  )
}
