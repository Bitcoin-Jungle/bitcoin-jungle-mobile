import { useMemo } from 'react'
import EStyleSheet from 'react-native-extended-stylesheet'
import { useThemeColor } from '../theme/useThemeColor'
import { ThemeColors } from '../theme/colors'

type StyleFunction<T> = (colors: ThemeColors) => T

export function useThemedStyles<T>(styleFunction: StyleFunction<T>): T {
  const colors = useThemeColor()
  
  return useMemo(() => {
    const styles = styleFunction(colors)
    
    // If the result is an object with style definitions, process it with EStyleSheet
    if (typeof styles === 'object' && styles !== null) {
      return EStyleSheet.create(styles as any)
    }
    
    return styles
  }, [colors, styleFunction])
}

// Helper function for components that need both EStyleSheet and theme colors
export function createThemedStyles<T extends Record<string, any>>(
  baseStyles: T,
  colorOverrides?: (colors: ThemeColors) => Partial<T>
): StyleFunction<T> {
  return (colors: ThemeColors) => {
    const overrides = colorOverrides ? colorOverrides(colors) : {}
    
    // Deep merge base styles with color overrides
    const mergedStyles = { ...baseStyles }
    
    for (const key in overrides) {
      if (overrides[key]) {
        mergedStyles[key] = {
          ...(baseStyles[key] || {}),
          ...overrides[key],
        }
      }
    }
    
    return mergedStyles
  }
}