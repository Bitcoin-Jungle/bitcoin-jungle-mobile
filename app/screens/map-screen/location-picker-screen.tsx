import { RouteProp } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Button, Icon } from "react-native-elements"
import RNMapView, { PROVIDER_GOOGLE, Region } from "react-native-maps"

import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { useThemeColor } from "../../theme/useThemeColor"
import { ScreenType } from "../../types/jsx"
import useUserLocation from "./use-user-location"

const CR_REGION = {
  latitude: 9.7489,
  longitude: -83.7534,
  latitudeDelta: 0.6,
  longitudeDelta: 0.6,
}

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "locationPicker">
  route: RouteProp<RootStackParamList, "locationPicker">
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    mapWrap: { flex: 1 },
    // Pin fixed at the map's visual center; map pans underneath it. Raised by
    // ~half its height so the tip points at the exact center coordinate.
    centerPin: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    pinIcon: { marginBottom: 40 },
    hint: {
      position: "absolute",
      top: 12,
      left: 16,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 4,
      elevation: 3,
    },
    hintText: { color: colors.text, fontSize: 13, textAlign: "center" },
    locateContainer: { position: "absolute", right: 16, bottom: 16 },
    locateBtn: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      borderWidth: 1,
      paddingHorizontal: 14,
    },
    locateText: { color: colors.primary, fontSize: 13, marginLeft: 4 },
    footer: {
      padding: 16,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    confirmBtn: { backgroundColor: colors.primary, height: 50, borderRadius: 10 },
  })
}

export const LocationPickerScreen: ScreenType = ({ navigation, route }: Props) => {
  const { initial, onPicked } = route.params
  const colors = useThemeColor()
  const styles = useStyles()
  const mapRef = React.useRef<RNMapView | null>(null)
  const { coords, status, request } = useUserLocation()

  const initialRegion: Region = {
    latitude: initial?.latitude ?? CR_REGION.latitude,
    longitude: initial?.longitude ?? CR_REGION.longitude,
    latitudeDelta: initial ? 0.01 : CR_REGION.latitudeDelta,
    longitudeDelta: initial ? 0.01 : CR_REGION.longitudeDelta,
  }
  // Map center == picked location; updated as the user pans.
  const centerRef = React.useRef({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
  })

  React.useEffect(() => {
    if (status === "granted" && coords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.lat,
          longitude: coords.lon,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      )
    }
  }, [status, coords])

  const onConfirm = () => {
    onPicked({ ...centerRef.current })
    navigation.goBack()
  }

  return (
    <Screen preset="fixed" style={styles.screen} unsafe>
      <View style={styles.mapWrap}>
        <RNMapView
          ref={(r) => {
            mapRef.current = r
          }}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation={status === "granted"}
          showsMyLocationButton={false}
          onRegionChangeComplete={(r) => {
            centerRef.current = { latitude: r.latitude, longitude: r.longitude }
          }}
        />
        <View pointerEvents="none" style={styles.centerPin}>
          <Icon
            name="location"
            type="ionicon"
            size={44}
            color={colors.primary}
            iconStyle={styles.pinIcon}
          />
        </View>
        <View pointerEvents="none" style={styles.hint}>
          <Text style={styles.hintText}>{translate("MapScreen.pickLocationHint")}</Text>
        </View>
        <Button
          title={translate("MapScreen.useMyLocation")}
          icon={{ name: "locate", type: "ionicon", size: 16, color: colors.primary }}
          buttonStyle={styles.locateBtn}
          titleStyle={styles.locateText}
          containerStyle={styles.locateContainer}
          onPress={request}
        />
      </View>
      <View style={styles.footer}>
        <Button
          title={translate("MapScreen.confirmLocation")}
          buttonStyle={styles.confirmBtn}
          onPress={onConfirm}
        />
      </View>
    </Screen>
  )
}
