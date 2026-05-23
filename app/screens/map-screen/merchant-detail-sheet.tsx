import * as React from "react"
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import { Button, Icon } from "react-native-elements"
import Modal from "react-native-modal"

import useMainQuery from "@app/hooks/use-main-query"
import { openWhatsApp } from "@app/utils/external"
import { WHATSAPP_CONTACT_NUMBER } from "../../constants/support"
import { translate } from "../../i18n"
import { useThemeColor } from "../../theme/useThemeColor"
import { BtcMapPlace } from "../../types/btcmap"
import {
  directionsUrl,
  localized,
  paymentMethods,
  verificationStatus,
} from "../../utils/btcmap"

type Props = {
  place: BtcMapPlace | null
  onClose: () => void
  currentView: "map" | "list"
  onViewOnMap: (p: BtcMapPlace) => void
}


const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    backdrop: { justifyContent: "flex-end", margin: 0 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 12,
      paddingBottom: 24,
      maxHeight: "80%",
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.divider,
      marginBottom: 12,
    },
    body: { paddingHorizontal: 20 },
    name: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 4 },
    address: { color: colors.textSecondary, fontSize: 14, marginBottom: 12 },
    description: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    rowIcon: { width: 28 },
    rowText: { color: colors.text, fontSize: 14, flex: 1 },
    rowLink: { color: colors.link },
    badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.buttonSecondary,
    },
    badgeText: { color: colors.buttonSecondaryText, fontSize: 12, fontWeight: "500" },
    statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    statusFresh: { backgroundColor: colors.success },
    statusStale: { backgroundColor: colors.warning },
    statusUnverified: { backgroundColor: colors.error },
    statusText: { color: colors.textSecondary, fontSize: 12 },
    ctaRow: { flexDirection: "row", gap: 12, marginTop: 12 },
    ctaPrimary: { flex: 1, backgroundColor: colors.primary },
    ctaSecondary: { flex: 1, backgroundColor: colors.buttonSecondary },
    ctaSecondaryText: { color: colors.buttonSecondaryText },
  })
}

export const MerchantDetailSheet: React.FC<Props> = ({
  place,
  onClose,
  currentView,
  onViewOnMap,
}) => {
  const styles = useStyles()
  const colors = useThemeColor()
  const { userPreferredLanguage } = useMainQuery()

  if (!place) return null

  const name = localized(place, "name", userPreferredLanguage) || "—"
  const description = localized(place, "description", userPreferredLanguage)
  const methods = paymentMethods(place)
  const status = verificationStatus(place)
  const lat = place.lat
  const lon = place.lon

  const openDirections = () => {
    if (typeof lat !== "number" || typeof lon !== "number") return
    Linking.openURL(directionsUrl(lat, lon, name, Platform.OS === "ios" ? "ios" : "android"))
  }
  const openPhone = () => place.phone && Linking.openURL(`tel:${place.phone}`)
  const openWebsite = () => place.website && Linking.openURL(place.website)
  const openReport = () => {
    const message = `Hi Bitcoin Jungle, I'd like to report an issue with this merchant:\n\nName: ${name}\nBTC Map ID: ${place.id}\nCoords: ${lat}, ${lon}\n\nIssue: `
    openWhatsApp(WHATSAPP_CONTACT_NUMBER, encodeURIComponent(message))
  }

  return (
    <Modal
      isVisible={!!place}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      swipeThreshold={50}
      onBackButtonPress={onClose}
      backdropColor={colors.backdrop}
      style={styles.backdrop}
      propagateSwipe
    >
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView style={styles.body}>
          <Text style={styles.name}>{name}</Text>
          {place.address ? (
            <Text style={styles.address}>{place.address}</Text>
          ) : null}

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                status === "fresh"
                  ? styles.statusFresh
                  : status === "stale"
                  ? styles.statusStale
                  : styles.statusUnverified,
              ]}
            />
            <Text style={styles.statusText}>
              {status === "fresh"
                ? `Verified ${formatVerifiedAt(place.verified_at)}`
                : status === "stale"
                ? `Last verified ${formatVerifiedAt(place.verified_at)} — may be out of date`
                : "Not recently verified"}
            </Text>
          </View>

          {methods.length > 0 ? (
            <View style={styles.badgesRow}>
              {methods.map((m) => (
                <View key={m} style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {m === "lightning" ? "⚡ Lightning" : m === "onchain" ? "₿ On-chain" : "📡 NFC"}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {description ? <Text style={styles.description}>{description}</Text> : null}

          {place.phone ? (
            <View style={styles.row}>
              <Icon name="call" type="ionicon" size={18} color={colors.iconDefault} containerStyle={styles.rowIcon} />
              <Text style={[styles.rowText, styles.rowLink]} onPress={openPhone}>
                {place.phone}
              </Text>
            </View>
          ) : null}

          {place.website ? (
            <View style={styles.row}>
              <Icon name="globe-outline" type="ionicon" size={18} color={colors.iconDefault} containerStyle={styles.rowIcon} />
              <Text style={[styles.rowText, styles.rowLink]} onPress={openWebsite} numberOfLines={1}>
                {place.website}
              </Text>
            </View>
          ) : null}

          {place.opening_hours ? (
            <View style={styles.row}>
              <Icon name="time-outline" type="ionicon" size={18} color={colors.iconDefault} containerStyle={styles.rowIcon} />
              <Text style={styles.rowText}>{place.opening_hours}</Text>
            </View>
          ) : null}

          <View style={styles.ctaRow}>
            {currentView === "list" ? (
              <Button
                title="View on Map"
                icon={{ name: "map", type: "ionicon", color: "white", size: 16 }}
                buttonStyle={styles.ctaPrimary}
                onPress={() => onViewOnMap(place)}
                disabled={typeof lat !== "number" || typeof lon !== "number"}
              />
            ) : (
              <Button
                title="Get Directions"
                icon={{ name: "navigate", type: "ionicon", color: "white", size: 16 }}
                buttonStyle={styles.ctaPrimary}
                onPress={openDirections}
                disabled={typeof lat !== "number" || typeof lon !== "number"}
              />
            )}
            <Button
              title={translate("MapScreen.reportModalTitle")}
              buttonStyle={styles.ctaSecondary}
              titleStyle={styles.ctaSecondaryText}
              onPress={openReport}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function formatVerifiedAt(iso: string | undefined): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short" })
  } catch {
    return ""
  }
}
