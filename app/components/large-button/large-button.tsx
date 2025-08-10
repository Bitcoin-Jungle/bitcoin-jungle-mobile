import * as React from "react"
import { ListItem, Avatar } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import { ComponentType } from "../../types/jsx"

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
    accountView: {
      marginHorizontal: "30rem",
      marginTop: "15rem",
    },

    accountViewContainer: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    
    transactionViewContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
    },

    accountViewTitle: {
      // fontFamily: "DMSans",
      color: colors.text,
      fontSize: "18rem",
      fontWeight: "bold",
    },
  })
}

export const LargeButton: ComponentType = ({
  style,
  icon,
  title,
  onPress,
  ...props
}: {
  icon: React.Component
  title: string
  onPress: () => void
  style?
}) => {
  const styles = useStyles()
  const colors = useThemeColor()
  
  return (
    <ListItem
      style={styles.accountView}
      containerStyle={style ? styles[style] : styles.accountViewContainer}
      onPress={onPress}
      underlayColor={colors.surfaceElevated}
      activeOpacity={0.7}
      {...props}
    >
      <Avatar>{icon}</Avatar>
      <ListItem.Content>
        <ListItem.Title style={styles.accountViewTitle}>{title}</ListItem.Title>
      </ListItem.Content>
    </ListItem>
  )
}
