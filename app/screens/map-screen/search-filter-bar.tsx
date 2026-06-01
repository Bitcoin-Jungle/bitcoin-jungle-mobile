import * as React from "react"
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Icon } from "react-native-elements"

import { translate } from "../../i18n"
import { useThemeColor } from "../../theme/useThemeColor"
import { MerchantCategory } from "../../types/btcmap"
import { categoryLabelKey } from "../../utils/btcmap"

type Props = {
  query: string
  onQueryChange: (q: string) => void
  selectedCategories: Set<MerchantCategory>
  onToggleCategory: (c: MerchantCategory) => void
  onClearFilters: () => void
}

const CATEGORIES: { key: MerchantCategory; icon: string }[] = [
  { key: "restaurant", icon: "restaurant-outline" },
  { key: "cafe", icon: "cafe-outline" },
  { key: "hotel", icon: "bed-outline" },
  { key: "retail", icon: "bag-outline" },
  { key: "tourism", icon: "compass-outline" },
  { key: "health", icon: "medkit-outline" },
  { key: "services", icon: "briefcase-outline" },
  { key: "transport", icon: "car-outline" },
  { key: "other", icon: "pin-outline" },
]

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    container: { backgroundColor: colors.surface, paddingTop: 8, paddingBottom: 8 },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      marginHorizontal: 12,
      paddingHorizontal: 10,
      height: 38,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      paddingHorizontal: 6,
      paddingVertical: 0,
      fontSize: 14,
    },
    chipsRow: { paddingHorizontal: 8, paddingTop: 8 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.buttonSecondary,
      marginHorizontal: 4,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.buttonSecondaryText, fontSize: 13, marginLeft: 4 },
    chipTextActive: { color: colors.buttonPrimaryText },
    clearChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginHorizontal: 4,
    },
    clearChipText: { color: colors.link, fontSize: 13 },
  })
}

export const SearchFilterBar: React.FC<Props> = ({
  query,
  onQueryChange,
  selectedCategories,
  onToggleCategory,
  onClearFilters,
}) => {
  const styles = useStyles()
  const colors = useThemeColor()
  const hasFilters = query.length > 0 || selectedCategories.size > 0

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Icon name="search" type="ionicon" size={18} color={colors.iconDefault} />
        <TextInput
          style={styles.searchInput}
          placeholder={translate("MapScreen.searchPlaceholder")}
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={onQueryChange}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => onQueryChange("")}>
            <Icon name="close-circle" type="ionicon" size={18} color={colors.iconDefault} />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
      >
        {CATEGORIES.map((c) => {
          const active = selectedCategories.has(c.key)
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggleCategory(c.key)}
            >
              <Icon
                name={c.icon}
                type="ionicon"
                size={14}
                color={active ? colors.buttonPrimaryText : colors.buttonSecondaryText}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {translate(categoryLabelKey(c.key))}
              </Text>
            </TouchableOpacity>
          )
        })}
        {hasFilters ? (
          <TouchableOpacity style={styles.clearChip} onPress={onClearFilters}>
            <Text style={styles.clearChipText}>{translate("MapScreen.clearFilters")}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  )
}
