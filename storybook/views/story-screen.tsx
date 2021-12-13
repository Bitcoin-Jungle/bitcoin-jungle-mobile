import * as React from "react"
import { ViewStyle, KeyboardAvoidingView, Platform,StyleSheet } from "react-native"
import { ApolloProvider } from "@apollo/client"
import { createMockClient } from "mock-apollo-client"


const mockClient = createMockClient()
const behavior = Platform.OS === "ios" ? "padding" : null
export const StoryScreen = (props) => (
  <KeyboardAvoidingView style={styles.ROOT} behavior={behavior} keyboardVerticalOffset={50}>
    <ApolloProvider client={mockClient}>{props.children}</ApolloProvider>
  </KeyboardAvoidingView>
)


const styles = StyleSheet.create({
  ROOT : { backgroundColor: "#f0f0f0", flex: 1 }
});
