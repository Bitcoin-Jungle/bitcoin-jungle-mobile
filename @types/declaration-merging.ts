declare module "react-native" {
    export interface ViewStyle {
    backgroundColor: string
  }
  export interface TextStyle {
    fontWeight: string
    color: string
  }
  export interface StoryScreenProps {
    children?: React.ReactNode
  }

  export interface StoryProps {
    children?: React.ReactNode
  }
  export interface UseCaseProps {
    /** The title. */
    text: string
    /** When should we be using this? */
    usage?: string
    /** The component use case. */
    children: React.ReactNode
    /** A style override. Rarely used. */
    style?: {}
    /** Don't use any padding because it's important to see the spacing. */
    noPad?: boolean
    /** Don't use background color because it's important to see the color. */
    noBackground?: boolean
  }
}
