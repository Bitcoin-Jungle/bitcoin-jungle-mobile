import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Icon } from "react-native-elements"
import ReactNativeHapticFeedback from "react-native-haptic-feedback"
import ClusteredMapView from "react-native-map-clustering"
import RNMapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"

import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { PrimaryStackParamList, RootStackParamList } from "../../navigation/stack-param-lists"
import { useThemeColor } from "../../theme/useThemeColor"
import { ScreenType } from "../../types/jsx"
import { BtcMapPlace, MerchantCategory } from "../../types/btcmap"
import {
  inferCategory,
  localized,
} from "../../utils/btcmap"
import useMainQuery from "@app/hooks/use-main-query"

import { LocationPrePrompt } from "./location-pre-prompt"
import { MerchantDetailSheet } from "./merchant-detail-sheet"
import { MerchantList } from "./merchant-list"
import { SearchFilterBar } from "./search-filter-bar"
import useBtcMapPlaces from "./use-btcmap-places"
import useUserLocation from "./use-user-location"

const COSTA_RICA_REGION = {
  latitude: 9.7489,
  longitude: -83.7534,
  latitudeDelta: 3.2,
  longitudeDelta: 3.2,
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    map: { flex: 1 },
    listContainer: { flex: 1 },
    toggleRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    toggleBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    toggleText: { color: colors.textSecondary, fontSize: 14, marginLeft: 6 },
    toggleTextActive: { color: colors.primary, fontWeight: "600" },
    fabContainer: {
      position: "absolute",
      right: 16,
      bottom: 24,
      alignItems: "flex-end",
    },
    fab: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 4,
    },
    fabPrimary: { backgroundColor: colors.primary },
    loadingOverlay: {
      position: "absolute",
      top: 12,
      alignSelf: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 4,
      elevation: 2,
    },
    loadingText: { color: colors.text, fontSize: 12, marginLeft: 8 },
    focusBanner: {
      position: "absolute",
      top: 12,
      left: 16,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 4,
    },
    focusBannerText: { color: colors.text, fontSize: 13, flex: 1, marginRight: 12 },
    focusBannerBtn: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },
  })
}

type Props = {
  navigation: StackNavigationProp<PrimaryStackParamList, "Map">
}

export const MapScreen: ScreenType = ({ navigation }: Props) => {
  const styles = useStyles()
  const colors = useThemeColor()
  // addLocation/verifyLocation live on the root stack, not the Primary tabs.
  const rootNav = navigation as unknown as StackNavigationProp<RootStackParamList>
  const { userPreferredLanguage } = useMainQuery()
  const { places, loading, lastSync } = useBtcMapPlaces()
  const { coords: userCoords, status: locationStatus, request: requestLocation } =
    useUserLocation()

  const [view, setView] = React.useState<"map" | "list">("map")
  const [query, setQuery] = React.useState("")
  const [selectedCategories, setSelectedCategories] = React.useState<
    Set<MerchantCategory>
  >(new Set())
  const [selected, setSelected] = React.useState<BtcMapPlace | null>(null)
  const [prePromptVisible, setPrePromptVisible] = React.useState(false)
  const [focusedId, setFocusedId] = React.useState<number | null>(null)
  const mapRef = React.useRef<RNMapView | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return places.filter((p) => {
      if (selectedCategories.size > 0) {
        if (!selectedCategories.has(inferCategory(p))) return false
      }
      if (!q) return true
      const name = localized(p, "name", userPreferredLanguage)?.toLowerCase() || ""
      const desc = localized(p, "description", userPreferredLanguage)?.toLowerCase() || ""
      const addr = p.address?.toLowerCase() || ""
      return name.includes(q) || desc.includes(q) || addr.includes(q)
    })
  }, [places, query, selectedCategories, userPreferredLanguage])

  const focusedPlace = React.useMemo(
    () => (focusedId == null ? null : places.find((p) => p.id === focusedId) ?? null),
    [places, focusedId],
  )
  const markers = focusedPlace ? [focusedPlace] : filtered

  const toggleCategory = (c: MerchantCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const clearFilters = () => {
    setQuery("")
    setSelectedCategories(new Set())
    setFocusedId(null)
  }

  const onQueryChange = (v: string) => {
    setQuery(v)
    if (focusedId != null) setFocusedId(null)
  }

  const onToggleCategory = (c: MerchantCategory) => {
    toggleCategory(c)
    if (focusedId != null) setFocusedId(null)
  }

  const onMarkerPress = (p: BtcMapPlace) => {
    ReactNativeHapticFeedback.trigger("selection", {
      ignoreAndroidSystemSettings: false,
      enableVibrateFallback: true,
    })
    setSelected(p)
  }

  const onFindMe = () => {
    if (locationStatus === "granted" && userCoords) {
      mapRef.current?.animateToRegion(
        {
          latitude: userCoords.lat,
          longitude: userCoords.lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500,
      )
      return
    }
    setPrePromptVisible(true)
  }

  const onConfirmLocation = () => {
    setPrePromptVisible(false)
    requestLocation()
  }

  React.useEffect(() => {
    if (locationStatus === "granted" && userCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userCoords.lat,
          longitude: userCoords.lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500,
      )
    }
  }, [locationStatus, userCoords])

  const onAddMerchant = () => rootNav.navigate("addLocation")

  const onVerify = (p: BtcMapPlace) => {
    setSelected(null)
    rootNav.navigate("verifyLocation", { place: p, current: true })
  }

  const onReport = (p: BtcMapPlace) => {
    setSelected(null)
    rootNav.navigate("verifyLocation", { place: p, current: false })
  }

  const onViewOnMap = (p: BtcMapPlace) => {
    if (typeof p.lat !== "number" || typeof p.lon !== "number") return
    setSelected(null)
    setFocusedId(p.id)
    setView("map")
    setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: p.lat as number,
          longitude: p.lon as number,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      )
    }, 300)
  }

  return (
    <Screen style={styles.screen} unsafe>
      <SearchFilterBar
        query={query}
        onQueryChange={onQueryChange}
        selectedCategories={selectedCategories}
        onToggleCategory={onToggleCategory}
        onClearFilters={clearFilters}
      />
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === "map" && styles.toggleBtnActive]}
          onPress={() => setView("map")}
        >
          <Icon
            name="map-outline"
            type="ionicon"
            size={16}
            color={view === "map" ? colors.primary : colors.iconDefault}
          />
          <Text style={[styles.toggleText, view === "map" && styles.toggleTextActive]}>
            {translate("MapScreen.viewMap")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === "list" && styles.toggleBtnActive]}
          onPress={() => {
            setFocusedId(null)
            setView("list")
          }}
        >
          <Icon
            name="list-outline"
            type="ionicon"
            size={16}
            color={view === "list" ? colors.primary : colors.iconDefault}
          />
          <Text style={[styles.toggleText, view === "list" && styles.toggleTextActive]}>
            {translate("MapScreen.viewList")}
          </Text>
        </TouchableOpacity>
      </View>

      {view === "map" ? (
        <View style={styles.map}>
          <ClusteredMapView
            mapRef={(r) => {
              // react-native-map-clustering exposes the underlying MapView
              // via the mapRef callback prop. We stash it for animateToRegion.
              mapRef.current = (r as unknown as { current?: RNMapView })?.current ?? (r as unknown as RNMapView)
            }}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={COSTA_RICA_REGION}
            showsUserLocation={locationStatus === "granted"}
            showsMyLocationButton={false}
            clusterColor={colors.primary}
            radius={50}
          >
            {markers.map((p) =>
              typeof p.lat === "number" && typeof p.lon === "number" ? (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.lat, longitude: p.lon }}
                  onPress={() => onMarkerPress(p)}
                  tracksViewChanges={false}
                />
              ) : null,
            )}
          </ClusteredMapView>
          {focusedPlace ? (
            <View style={styles.focusBanner}>
              <Text style={styles.focusBannerText} numberOfLines={1}>
                {localized(focusedPlace, "name", userPreferredLanguage) ||
                  translate("MapScreen.merchantFallback")}
              </Text>
              <TouchableOpacity onPress={() => setFocusedId(null)}>
                <Text style={styles.focusBannerBtn}>{translate("MapScreen.showAll")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {loading && places.length === 0 ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{translate("MapScreen.loadingMerchants")}</Text>
            </View>
          ) : null}
          <View style={styles.fabContainer} pointerEvents="box-none">
            <TouchableOpacity style={styles.fab} onPress={onAddMerchant}>
              <Icon name="add" type="ionicon" size={24} color={colors.iconDefault} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fab, styles.fabPrimary]} onPress={onFindMe}>
              <Icon name="locate" type="ionicon" size={22} color={colors.buttonPrimaryText} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <MerchantList
            places={filtered}
            userCoords={userCoords}
            onSelect={setSelected}
            lastSync={lastSync}
          />
        </View>
      )}

      <LocationPrePrompt
        visible={prePromptVisible}
        onConfirm={onConfirmLocation}
        onCancel={() => setPrePromptVisible(false)}
      />
      <MerchantDetailSheet
        place={selected}
        onClose={() => setSelected(null)}
        currentView={view}
        onViewOnMap={onViewOnMap}
        onVerify={onVerify}
        onReport={onReport}
      />
    </Screen>
  )
}
