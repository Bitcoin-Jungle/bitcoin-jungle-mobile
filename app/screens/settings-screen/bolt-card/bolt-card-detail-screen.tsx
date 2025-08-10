import * as React from "react"
import { useState } from "react"
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { Button, Divider, Icon, ListItem } from "react-native-elements"
import { useMutation, useQuery } from "@apollo/client"
import { RouteProp } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"

import { Screen } from "../../../components/screen"
import { translate } from "../../../i18n"
import { palette } from "../../../theme/palette"
import { useThemeColor } from "../../../theme/useThemeColor"
import { RootStackParamList } from "../../../navigation/stack-param-lists"
import { BOLT_CARD_QUERY, BOLT_CARD_UPDATE_MUTATION, BOLT_CARD_DISABLE_MUTATION } from "../../../graphql/query"
import { formatDate } from "../../../utils/date"

type BoltCardDetailScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "boltCardDetail">
  route: RouteProp<RootStackParamList, "boltCardDetail">
}

export const BoltCardDetailScreen: React.FC<BoltCardDetailScreenProps> = ({ navigation, route }) => {
  const colors = useThemeColor()
  const { cardId } = route.params
  const { data, loading, error, refetch } = useQuery(BOLT_CARD_QUERY, {
    variables: { id: cardId },
  })
  const [updateCard] = useMutation(BOLT_CARD_UPDATE_MUTATION)
  const [disableCard] = useMutation(BOLT_CARD_DISABLE_MUTATION)
  const [isEditing, setIsEditing] = useState(false)
  const [cardName, setCardName] = useState("")
  const [txLimit, setTxLimit] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(0)
  const styles = useStyles()

  const card = data?.boltCard

  React.useEffect(() => {
    if (card) {
      setCardName(card.cardName)
      setTxLimit(card.txLimit)
      setDailyLimit(card.dailyLimit)
    }
  }, [card])

  const handleToggleEnabled = async () => {
    if (!card) return

    if (card.enabled) {
      Alert.alert(
        translate("BoltCardScreen.disableCardTitle"),
        translate("BoltCardScreen.disableCardMessage"),
        [
          {
            text: translate("common.cancel"),
            style: "cancel",
          },
          {
            text: translate("common.disable"),
            style: "destructive",
            onPress: async () => {
              try {
                await disableCard({
                  variables: {
                    input: {
                      id: cardId,
                    },
                  },
                  refetchQueries: [{ query: BOLT_CARD_QUERY, variables: { id: cardId } }],
                })
                Alert.alert(
                  translate("common.success"),
                  translate("BoltCardScreen.cardDisabled"),
                )
              } catch (err) {
                Alert.alert(translate("common.error"), err.toString())
              }
            },
          },
        ],
      )
    } else {
      try {
        await updateCard({
          variables: {
            input: {
              id: cardId,
              cardName,
              enabled: true,
              limits: {
                tx: txLimit,
                daily: dailyLimit,
              },
            },
          },
          refetchQueries: [{ query: BOLT_CARD_QUERY, variables: { id: cardId } }],
        })
        Alert.alert(
          translate("common.success"),
          translate("BoltCardScreen.cardEnabled"),
        )
      } catch (err) {
        Alert.alert(translate("common.error"), err.toString())
      }
    }
  }

  const handleSaveChanges = async () => {
    try {
      await updateCard({
        variables: {
          input: {
            id: cardId,
            cardName,
            limits: {
              tx: txLimit,
              daily: dailyLimit,
            },
          },
        },
        refetchQueries: [{ query: BOLT_CARD_QUERY, variables: { id: cardId } }],
      })
      setIsEditing(false)
      Alert.alert(
        translate("common.success"),
        translate("BoltCardScreen.cardUpdated"),
      )
    } catch (err) {
      Alert.alert(translate("common.error"), err.toString())
    }
  }

  const renderCardUsage = () => {
    const usages = card?.usages.filter((usage) => usage.amount > 0) || []

    if (!card || !usages || usages.length === 0) {
      return (
        <View style={styles.emptyUsage}>
          <Text style={styles.emptyUsageText}>{translate("BoltCardScreen.noUsageHistory")}</Text>
        </View>
      )
    }

    return (
      <View>
        {usages.map((usage, index) => (
          <View key={usage.id} style={styles.usageItem}>
            <View style={styles.usageHeader}>
              <Text style={styles.usageDate}>{formatDate({ createdAt: usage.createdAt, showFullDate: false })}</Text>
              <Text style={styles.usageAmount}>{usage.amount} sats</Text>
            </View>
            <Text style={styles.usageCounter}>
              {translate("BoltCardScreen.counter")}: {usage.newCounter}
            </Text>
            {index < card.usages.length - 1 && <Divider style={styles.usageDivider} />}
          </View>
        ))}
      </View>
    )
  }

  if (loading) {
    return (
      <Screen preset="scroll">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </Screen>
    )
  }

  if (error || !card) {
    return (
      <Screen preset="scroll">
        <View style={styles.errorContainer}>
          <Icon
            name="alert-circle-outline"
            type="material-community"
            size={64}
            color={colors.error}
          />
          <Text style={styles.errorText}>{translate("common.error")}</Text>
          <Text style={styles.errorMessage}>{error ? error.message : translate("BoltCardScreen.cardNotFound")}</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll">
      <ScrollView>
        <View style={styles.header}>
          <Icon
            name={card.enabled ? "credit-card-outline" : "credit-card-off-outline"}
            type="material-community"
            size={48}
            color={card.enabled ? colors.text : colors.textSecondary}
          />
          {isEditing ? (
            <ListItem.Input
              value={cardName}
              onChangeText={setCardName}
              style={styles.cardNameInput}
            />
          ) : (
            <Text style={[styles.cardName, !card.enabled && styles.cardNameDisabled]}>
              {card.cardName}
            </Text>
          )}
          <Text style={styles.cardStatus}>
            {card.enabled
              ? translate("BoltCardScreen.enabled")
              : translate("BoltCardScreen.disabled")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translate("BoltCardScreen.cardDetails")}</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{translate("BoltCardScreen.uid")}</Text>
            <Text style={styles.detailValue}>{card.uid}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{translate("BoltCardScreen.createdAt")}</Text>
            <Text style={styles.detailValue}>{formatDate({ createdAt: card.createdAt, showFullDate: true })}</Text>
          </View>
          
          {card.lastUsedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{translate("BoltCardScreen.lastUsedAt")}</Text>
              <Text style={styles.detailValue}>{formatDate({ createdAt: card.lastUsedAt, showFullDate: true })}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translate("BoltCardScreen.spendingLimits")}</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{translate("BoltCardScreen.txLimit")}</Text>
            {isEditing ? (
              <ListItem.Input
                value={txLimit.toString()}
                onChangeText={(text) => setTxLimit(parseInt(text) || 0)}
                keyboardType="numeric"
                style={styles.limitInput}
              />
            ) : (
              <Text style={styles.detailValue}>{card.txLimit} sats</Text>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{translate("BoltCardScreen.dailyLimit")}</Text>
            {isEditing ? (
              <ListItem.Input
                value={dailyLimit.toString()}
                onChangeText={(text) => setDailyLimit(parseInt(text) || 0)}
                keyboardType="numeric"
                style={styles.limitInput}
              />
            ) : (
              <Text style={styles.detailValue}>{card.dailyLimit} sats</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translate("BoltCardScreen.usageHistory")}</Text>
          <Divider style={styles.divider} />
          {renderCardUsage()}
        </View>

        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <Button
                title={translate("common.save")}
                onPress={handleSaveChanges}
                buttonStyle={styles.saveButton}
              />
              <Button
                title={translate("common.cancel")}
                onPress={() => {
                  setIsEditing(false)
                  setCardName(card.cardName)
                  setTxLimit(card.txLimit)
                  setDailyLimit(card.dailyLimit)
                }}
                buttonStyle={styles.cancelButton}
                titleStyle={styles.cancelButtonText}
                type="outline"
              />
            </>
          ) : (
            <>
              <Button
                title={
                  card.enabled
                    ? translate("BoltCardScreen.disableCard")
                    : translate("BoltCardScreen.enableCard")
                }
                onPress={handleToggleEnabled}
                buttonStyle={card.enabled ? styles.disableButton : styles.enableButton}
              />
              {card.enabled && (
                <Button
                  title={translate("BoltCardScreen.editCard")}
                  onPress={() => setIsEditing(true)}
                  buttonStyle={styles.editButton}
                  titleStyle={styles.editButtonText}
                  type="outline"
                />
              )}
              <Button
                title={translate("BoltCardScreen.pairExistingCard")}
                onPress={() => navigation.navigate("boltCardPair", { cardId, cardUID: card.uid })}
                buttonStyle={styles.editButton}
              />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const useStyles = () => {
  const colors = useThemeColor()
  return StyleSheet.create({
    header: {
      alignItems: "center",
      padding: 20,
      backgroundColor: colors.surface,
    },
    cardName: {
      fontSize: 24,
      fontWeight: "bold",
      marginTop: 10,
      color: colors.text,
    },
    cardNameDisabled: {
      color: colors.textSecondary,
    },
    cardNameInput: {
      fontSize: 24,
      fontWeight: "bold",
      marginTop: 10,
      textAlign: "center",
      color: colors.text,
    },
    cardStatus: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 5,
    },
    section: {
      marginTop: 20,
      paddingHorizontal: 15,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 10,
    },
    divider: {
      backgroundColor: colors.border,
      marginBottom: 10,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
    },
    detailLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    detailValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
      maxWidth: "60%",
      textAlign: "right",
    },
    limitInput: {
      width: 100,
      textAlign: "right",
      color: colors.text,
    },
    usageItem: {
      paddingVertical: 10,
    },
    usageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    usageDate: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    usageAmount: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
    },
    usageCounter: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 5,
    },
    usageDivider: {
      backgroundColor: colors.border,
      marginTop: 10,
    },
    emptyUsage: {
      padding: 20,
      alignItems: "center",
    },
    emptyUsageText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    buttonContainer: {
      padding: 20,
      marginTop: 10,
    },
    enableButton: {
      backgroundColor: colors.success,
      borderRadius: 8,
    },
    disableButton: {
      backgroundColor: colors.error,
      borderRadius: 8,
    },
    editButton: {
      marginTop: 10,
      borderRadius: 8,
      borderColor: colors.primary,
    },
    editButtonText: {
      color: colors.primary,
    },
    saveButton: {
      backgroundColor: colors.success,
      borderRadius: 8,
    },
    cancelButton: {
      marginTop: 10,
      borderRadius: 8,
      borderColor: colors.textSecondary,
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    },
    errorText: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "bold",
      color: colors.error,
      textAlign: "center",
    },
    errorMessage: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
  })
} 