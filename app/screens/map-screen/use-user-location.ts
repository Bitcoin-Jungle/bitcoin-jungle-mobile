import { useCallback, useState } from "react"
import { Platform, PermissionsAndroid } from "react-native"
import Geolocation from "@react-native-community/geolocation"

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "error"

export type UserCoords = { lat: number; lon: number }

/**
 * Opt-in user location. The OS permission prompt only fires when the consumer
 * calls `request()` in response to a deliberate user action.
 *
 * Never auto-requests on mount.
 */
const useUserLocation = () => {
  const [coords, setCoords] = useState<UserCoords | null>(null)
  const [status, setStatus] = useState<LocationStatus>("idle")

  const request = useCallback(async () => {
    setStatus("requesting")

    if (Platform.OS === "android") {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        )
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          setStatus("denied")
          return
        }
      } catch {
        setStatus("error")
        return
      }
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setStatus("granted")
      },
      (err) => {
        if (err.code === 1 /* PERMISSION_DENIED */) {
          setStatus("denied")
        } else {
          setStatus("error")
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  return { coords, status, request }
}

export default useUserLocation
