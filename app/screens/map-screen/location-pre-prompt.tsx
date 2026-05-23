import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Button } from "react-native-elements"
import Modal from "react-native-modal"

import { translate } from "../../i18n"
import { useThemeColor } from "../../theme/useThemeColor"

type Props = {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    backdrop: {
      justifyContent: "center",
      alignItems: "center",
      margin: 0,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 24,
      width: "85%",
      maxWidth: 400,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 8,
    },
    body: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    privacy: {
      color: colors.textSecondary,
      fontSize: 13,
      fontStyle: "italic",
      marginBottom: 24,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.buttonSecondary,
    },
    cancelBtnText: {
      color: colors.buttonSecondaryText,
    },
    confirmBtn: {
      flex: 1,
      backgroundColor: colors.primary,
    },
  })
}

export const LocationPrePrompt: React.FC<Props> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const styles = useStyles()
  const colors = useThemeColor()

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onCancel}
      onBackButtonPress={onCancel}
      backdropColor={colors.backdrop}
      style={styles.backdrop}
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          {translate("MapScreen.locationPermissionTitle")}
        </Text>
        <Text style={styles.body}>
          {translate("MapScreen.locationPermissionMessage")}
        </Text>
        <Text style={styles.privacy}>
          Your location stays on your device. It is never sent to a server.
        </Text>
        <View style={styles.buttonRow}>
          <Button
            title={translate("MapScreen.locationPermissionNegative")}
            buttonStyle={styles.cancelBtn}
            titleStyle={styles.cancelBtnText}
            onPress={onCancel}
          />
          <Button
            title={translate("MapScreen.locationPermissionPositive")}
            buttonStyle={styles.confirmBtn}
            onPress={onConfirm}
          />
        </View>
      </View>
    </Modal>
  )
}
