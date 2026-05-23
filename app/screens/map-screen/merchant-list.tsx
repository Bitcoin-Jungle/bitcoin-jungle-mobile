import * as React from "react"
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Icon } from "react-native-elements"

import useMainQuery from "@app/hooks/use-main-query"
import { useThemeColor } from "../../theme/useThemeColor"
import { BtcMapPlace } from "../../types/btcmap"
import {
  distanceKm,
  inferCategory,
  localized,
  paymentMethods,
  verificationStatus,
} from "../../utils/btcmap"
import { UserCoords } from "./use-user-location"

type Props = {
  places: BtcMapPlace[]
  userCoords: UserCoords | null
  onSelect: (p: BtcMapPlace) => void
  lastSync: string | null
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    headerText: { color: colors.textSecondary, fontSize: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
      backgroundColor: colors.surface,
    },
    body: { flex: 1, marginLeft: 12 },
    name: { color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 2 },
    meta: { color: colors.textSecondary, fontSize: 12 },
    distance: { color: colors.textSecondary, fontSize: 12, marginLeft: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusFresh: { backgroundColor: colors.success },
    statusStale: { backgroundColor: colors.warning },
    statusUnverified: { backgroundColor: colors.error },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    emptyText: { color: colors.textSecondary, textAlign: "center" },
  })
}

export const MerchantList: React.FC<Props> = ({ places, userCoords, onSelect, lastSync }) => {
  const styles = useStyles()
  const colors = useThemeColor()
  const { userPreferredLanguage } = useMainQuery()

  const sorted = React.useMemo(() => {
    const withDist = places.map((p) => {
      const dist =
        userCoords && typeof p.lat === "number" && typeof p.lon === "number"
          ? distanceKm(userCoords, { lat: p.lat, lon: p.lon })
          : null
      return { p, dist }
    })
    if (userCoords) {
      return withDist.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    }
    return withDist.sort((a, b) => {
      const aName = localized(a.p, "name", userPreferredLanguage) || ""
      const bName = localized(b.p, "name", userPreferredLanguage) || ""
      return aName.localeCompare(bName)
    })
  }, [places, userCoords, userPreferredLanguage])

  const freshnessLabel = React.useMemo(() => {
    if (!lastSync) return "Loading…"
    try {
      const age = (Date.now() - Date.parse(lastSync)) / 1000
      if (age < 60) return "Updated just now"
      if (age < 3600) return `Updated ${Math.round(age / 60)}m ago`
      if (age < 86400) return `Updated ${Math.round(age / 3600)}h ago`
      return `Updated ${Math.round(age / 86400)}d ago`
    } catch {
      return ""
    }
  }, [lastSync])

  if (places.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No merchants match your filters.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {sorted.length} merchants · {freshnessLabel}
        </Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.p.id)}
        renderItem={({ item }) => {
          const p = item.p
          const status = verificationStatus(p)
          const cat = inferCategory(p)
          const methods = paymentMethods(p)
          const methodsLabel = methods
            .map((m) => (m === "lightning" ? "⚡" : m === "onchain" ? "₿" : "📡"))
            .join(" ")
          return (
            <TouchableOpacity style={styles.row} onPress={() => onSelect(p)}>
              <Icon
                name={iconForCategory(cat)}
                type="ionicon"
                size={22}
                color={colors.iconDefault}
              />
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {localized(p, "name", userPreferredLanguage) || "—"}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {capitalize(cat)}
                  {methodsLabel ? ` · ${methodsLabel}` : ""}
                </Text>
              </View>
              {item.dist !== null ? (
                <Text style={styles.distance}>{formatDistance(item.dist)}</Text>
              ) : null}
              <View
                style={[
                  styles.statusDot,
                  status === "fresh"
                    ? styles.statusFresh
                    : status === "stale"
                    ? styles.statusStale
                    : styles.statusUnverified,
                  { marginLeft: 8 },
                ]}
              />
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

function iconForCategory(c: ReturnType<typeof inferCategory>): string {
  switch (c) {
    case "restaurant": return "restaurant-outline"
    case "cafe": return "cafe-outline"
    case "hotel": return "bed-outline"
    case "retail": return "bag-outline"
    case "health": return "medkit-outline"
    case "tourism": return "compass-outline"
    case "services": return "briefcase-outline"
    case "transport": return "car-outline"
    default: return "pin-outline"
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
