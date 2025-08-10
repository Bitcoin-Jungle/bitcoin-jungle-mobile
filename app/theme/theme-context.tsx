import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  themeMode: 'light' | 'dark' | 'system'
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = '@bitcoin_jungle_theme_mode'

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme()
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    loadThemePreference()
  }, [])

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark')
    } else {
      setIsDark(themeMode === 'dark')
    }
  }, [themeMode, systemColorScheme])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY)
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeModeState(savedTheme as 'light' | 'dark' | 'system')
      }
    } catch (error) {
      console.error('Error loading theme preference:', error)
    }
  }

  const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode)
      setThemeModeState(mode)
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  const toggleTheme = () => {
    const nextMode = isDark ? 'light' : 'dark'
    setThemeMode(nextMode)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}