import * as React from "react"
import { StyleSheet, View } from "react-native"
import { Icon } from "react-native-elements"
import { Marker } from "react-native-maps"

import { useThemeColor } from "../../theme/useThemeColor"
import { markerIonicon } from "../../utils/btcmap"

type Props = {
  // `coordinate` is read by react-native-map-clustering to cluster this marker,
  // so it must stay a top-level prop (see helpers.isMarker).
  coordinate: { latitude: number; longitude: number }
  icon?: string
  onPress: () => void
}

const SIZE = 34

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    wrap: { alignItems: "center" },
    pin: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      backgroundColor: colors.primary,
      borderColor: colors.surface,
    },
    tail: {
      width: 0,
      height: 0,
      marginTop: -3,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 7,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.primary,
    },
  })
}

const MerchantMarkerBase: React.FC<Props> = ({ coordinate, icon, onPress }) => {
  const styles = useStyles()
  const colors = useThemeColor()
  // Custom marker views render blank under tracksViewChanges={false}. Track for
  // a beat so the view rasterizes, then stop for pan/zoom performance.
  const [tracks, setTracks] = React.useState(true)
  React.useEffect(() => {
    const t = setTimeout(() => setTracks(false), 600)
    return () => clearTimeout(t)
  }, [icon])

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.wrap}>
        <View style={styles.pin}>
          <Icon
            name={markerIonicon(icon)}
            type="ionicon"
            size={18}
            color={colors.buttonPrimaryText}
          />
        </View>
        <View style={styles.tail} />
      </View>
    </Marker>
  )
}

export const MerchantMarker = React.memo(MerchantMarkerBase)
