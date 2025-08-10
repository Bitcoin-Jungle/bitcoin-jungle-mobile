import { ThemeColors } from '../theme/colors'

export const themedStyles = (colors: ThemeColors) => ({
  primaryText: {
    color: colors.text,
  },
  secondaryText: {
    color: colors.textSecondary,
  },
  primaryBackground: {
    backgroundColor: colors.background,
  },
  surfaceBackground: {
    backgroundColor: colors.surface,
  },
  cardBackground: {
    backgroundColor: colors.cardBackground,
  },
  inputBackground: {
    backgroundColor: colors.inputBackground,
  },
  border: {
    borderColor: colors.border,
  },
  divider: {
    backgroundColor: colors.divider,
  },
  primaryButton: {
    backgroundColor: colors.buttonPrimary,
  },
  primaryButtonText: {
    color: colors.buttonPrimaryText,
  },
  secondaryButton: {
    backgroundColor: colors.buttonSecondary,
  },
  secondaryButtonText: {
    color: colors.buttonSecondaryText,
  },
  error: {
    color: colors.error,
  },
  success: {
    color: colors.success,
  },
  warning: {
    color: colors.warning,
  },
  link: {
    color: colors.link,
  },
  icon: {
    color: colors.iconDefault,
  },
  activeIcon: {
    color: colors.iconActive,
  },
  placeholder: {
    color: colors.placeholder,
  },
  modal: {
    backgroundColor: colors.modalBackground,
  },
  shadow: {
    shadowColor: colors.shadow,
  },
})