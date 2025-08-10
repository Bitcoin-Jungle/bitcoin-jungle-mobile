import { useTheme } from './theme-context'
import { lightColors, darkColors, ThemeColors } from './colors'

export const useThemeColor = (): ThemeColors => {
  const { isDark } = useTheme()
  return isDark ? darkColors : lightColors
}

export const getThemeColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkColors : lightColors
}