import * as React from "react"
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Icon } from "react-native-elements"
import { SvgXml } from "react-native-svg"

import { translate } from "../../i18n"
import { useThemeColor } from "../../theme/useThemeColor"
import { fetchCaptcha } from "../../utils/btcmap-submit"

/**
 * Manages a BTC Map captcha challenge lifecycle. The `secret` is what you pass
 * to the submit call as `captchaSecret`; the user's typed answer is `captchaTest`.
 */
export function useCaptcha() {
  const [svg, setSvg] = React.useState<string | null>(null)
  const [secret, setSecret] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const c = await fetchCaptcha()
      setSvg(c.svg)
      setSecret(c.secret)
    } catch {
      setError(true)
      setSvg(null)
      setSecret("")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return { svg, secret, loading, error, refresh }
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    container: { marginBottom: 16 },
    captchaBox: {
      backgroundColor: "#ffffff",
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      height: 100,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    input: {
      flex: 1,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      height: 44,
      fontSize: 16,
      letterSpacing: 2,
    },
    refreshBtn: {
      marginLeft: 8,
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonSecondary,
    },
    errorText: { color: colors.error, fontSize: 13, textAlign: "center" },
  })
}

type Props = {
  svg: string | null
  loading: boolean
  error: boolean
  value: string
  onChangeText: (v: string) => void
  onRefresh: () => void
}

export const CaptchaField: React.FC<Props> = ({
  svg,
  loading,
  error,
  value,
  onChangeText,
  onRefresh,
}) => {
  const styles = useStyles()
  const colors = useThemeColor()

  return (
    <View style={styles.container}>
      <View style={styles.captchaBox}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : error ? (
          <Text style={styles.errorText}>{translate("MapScreen.captchaError")}</Text>
        ) : svg ? (
          <SvgXml xml={svg} width="100%" height={100} />
        ) : null}
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={translate("MapScreen.captchaPlaceholder")}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={loading}>
          <Icon name="refresh" type="ionicon" size={22} color={colors.iconDefault} />
        </TouchableOpacity>
      </View>
    </View>
  )
}
