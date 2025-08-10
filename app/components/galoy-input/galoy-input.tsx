import * as React from "react"
import { TextInput } from "react-native"
import { Input, InputProps } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
import { useThemeColor } from "../../theme/useThemeColor"
import { ComponentType } from "../../types/jsx"

const useStyles = () => {
  const colors = useThemeColor()
  return EStyleSheet.create({
    inputContainerFocused: {
      borderBottomColor: colors.inputBorder,
    },
    inputStyle: {
      color: colors.text,
    },
  })
}

type GaloyInputProps = {
  initIsFocused?: boolean
}

const GaloyInputFunction = (
  props: InputProps & GaloyInputProps,
  ref: React.Ref<TextInput>,
) => {
  const [isFocused, setIsFocused] = React.useState(props.initIsFocused ?? false)
  const styles = useStyles()
  const colors = useThemeColor()

  return (
    <Input
      {...props}
      inputContainerStyle={[
        props.inputContainerStyle,
        isFocused ? styles.inputContainerFocused : null,
      ]}
      inputStyle={[styles.inputStyle, props.inputStyle]}
      placeholderTextColor={colors.placeholder}
      onFocus={(e) => {
        setIsFocused(true)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        setIsFocused(false)
        props.onBlur?.(e)
      }}
      ref={ref}
    />
  )
}

export const GaloyInput: ComponentType = React.forwardRef(GaloyInputFunction)
