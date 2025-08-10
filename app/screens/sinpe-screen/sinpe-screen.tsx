import * as React from "react"
import { useState, useEffect } from "react"
import SendSMS from 'react-native-sms'
// import { SendDirectSms } from 'react-native-send-direct-sms'
import { Screen } from "../../components/screen"
import type { ScreenType } from "../../types/jsx"
import useMainQuery from "@app/hooks/use-main-query"
import { ActivityIndicator, Text, View, Alert, Button, Platform, BackHandler, Linking, Share as RNShare, StyleSheet } from "react-native"
import { WebView } from 'react-native-webview'
import { gql, useApolloClient, useMutation } from "@apollo/client"
import { useWalletBalance } from "../../hooks"
import { getOtcBaseUri } from "../../utils/network"
import { palette } from "../../theme/palette"
import { useThemeColor } from "../../theme/useThemeColor"
import { validPayment } from "../../utils/parsing"
import useToken from "../../utils/use-token"
import { useMySubscription } from "../../hooks/user-hooks"
import Share from "react-native-share"
import RNFS from 'react-native-fs'
import { useSafeAreaInsets } from "react-native-safe-area-context"
// import analytics from "@react-native-firebase/analytics"

import { translate } from "../../i18n"
import { RootStackParamList } from "@app/navigation/stack-param-lists"
import { StackNavigationProp } from "@react-navigation/stack"
import { RouteProp } from "@react-navigation/native"

export const LN_PAY = gql`
  mutation lnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
    lnInvoicePaymentSend(input: $input) {
      errors {
        message
      }
      status
    }
  }
`

const ADD_INVOICE = gql`
  mutation lnInvoiceCreate($input: LnInvoiceCreateInput!) {
    lnInvoiceCreate(input: $input) {
      errors {
        message
      }
      invoice {
        paymentRequest
        paymentHash
      }
    }
  }
`

type SinpeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "sinpe">
  route: RouteProp<RootStackParamList, "sinpe">
}

export const SinpeScreen: ScreenType = ({route, navigation}: SinpeScreenProps) => {
  let webview = null
  const colors = useThemeColor()
  const { myPubKey, username, phoneNumber, userPreferredLanguage, refetch } = useMainQuery()
  const { walletId: myDefaultWalletId, satBalance, loading } = useWalletBalance()
  const { tokenNetwork } = useToken()
  const { formatCurrencyAmount } = useMySubscription()
  const [mySatBalance, setMySatBalance] = useState(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const otcBaseUri = getOtcBaseUri()
  const { orderNbr } = route?.params || {}
  const insets = useSafeAreaInsets()

  const handleBackButtonPress = () => {
    try {
      if(canGoBack) {
        this.webview.goBack()
        return true
      }
    } catch (err) {
      console.log("[handleBackButtonPress] Error : ", err.message)
    }

    return false
  }

  const sendMessage = (data) => {
    console.log('sendMessage', data)
    if(false && Platform.OS === 'android') {
      // SendDirectSms(data.to, decodeURIComponent(data.message))
      // .then((res) => {
      //   if(res && res === 'SMS sent') {
      //     const js = `
      //       window.dispatchEvent(new CustomEvent("smsSent"));

      //       true;
      //     `;
      //     this.webview.injectJavaScript(js);
      //   }
      // })
      // .catch((err) => console.log("catch", err))
    } else {
      console.log('manual send')
      SendSMS.send({
        body: data.message,
        recipients: [data.to],
        allowAndroidSendWithoutReadPermission: true,
        successTypes: ['all'],
      }, (completed, cancelled, error) => {
        console.log(completed,cancelled,error)

        if(completed) {
          const js = `
            window.dispatchEvent(new CustomEvent("smsSent"));

            true;
          `;
          this.webview.injectJavaScript(js);
        }
      })
    }
  }

  useState(() => {
    setMySatBalance(satBalance)
  }, [])

  const runFirst = `
    true;
  `;

  const [lnPay] = useMutation(LN_PAY, {
    onCompleted: () => refetch(),
  })

  const [addInvoice] = useMutation(ADD_INVOICE, {
    onCompleted: () => refetch(),
  })

  const payLightning = async (bolt11) => {
    try {
      const { amount } = validPayment(bolt11, tokenNetwork, myPubKey, username)

      if (amount > satBalance) {
        Alert.alert('Error!', translate("SendBitcoinConfirmationScreen.totalExceedWithAmount", {
          balance: formatCurrencyAmount({ sats: satBalance, currency: "USD" }),
          amount: formatCurrencyAmount({sats: amount, currency: "USD"}),
        }))
        return
      }

      const { data, errors } = await lnPay({
        variables: {
          input: {
            walletId: myDefaultWalletId,
            paymentRequest: bolt11,
            memo: 'SINPE',
          },
        },
      })

      const status = data.lnInvoicePaymentSend.status
      const errs = errors
        ? errors.map((error) => {
            return { message: error.message }
          })
        : data.lnInvoicePaymentSend.errors
      handlePaymentReturn(status, errs)
    } catch (err) {
      console.log('error', err)
      // handlePaymentError(err)
    }
  }

  const createInvoice = async(satAmount) => {
    console.log('create invoice', satAmount)
    try {
      const { data, errors } = await addInvoice({
        variables: {
          input: { 
            walletId: myDefaultWalletId,
            amount: satAmount, 
            memo: `SINPE to BTC (${satAmount} sats)`
          },
        },
      })

      console.log(data, errors)

      const errs = errors
        ? errors.map((error) => {
            return { message: error.message }
          })
        : data.lnInvoiceCreate.errors
      handleInvoiceReturn(data.lnInvoiceCreate.invoice.paymentRequest, errs)
    } catch(err) {
      handleInvoiceError(err)
    }
  }

  const handlePaymentReturn = (status, errors) => {    
    if (status === "SUCCESS" || status === "PENDING" || status === "ALREADY_PAID") {
     
    } else {
      let errorMessage = ''
      if (errors && Array.isArray(errors)) {
        errorMessage = errors.map((error) => error.message).join(", ")
      } else {
        errorMessage = translate("errors.generic")
      }

      Alert.alert("Error!", errorMessage)
    }
  }

  const handleInvoiceReturn = (invoice, errors) => {    
    console.log(invoice, errors)
    if (!errors || !errors.length) {
      setTimeout(() => {
        const js = `
          window.dispatchEvent(new CustomEvent("invoiceCreated", {detail: { bolt11: "${invoice}"}}));

          true;
        `;
        this.webview.injectJavaScript(js);
      }, 250)

    } else {
      let errorMessage = ''
      if (errors && Array.isArray(errors)) {
        errorMessage = errors.map((error) => error.message).join(", ")
      } else {
        errorMessage = translate("errors.generic")
      }

      Alert.alert("Error!", errorMessage)
    }
  }

  const handleInvoiceError = (error) => {
   Alert.alert(translate("errors.generic"))
  }

  const downloadFile = async (data, filename, mimeType) => {
    try {
      console.log('downloadFile', data, filename, mimeType)
      
      // Validate inputs
      if (!data) {
        throw new Error('No data provided for file download')
      }
      if (!filename) {
        throw new Error('No filename provided for file download')
      }
      
      const fileBase64 = btoa(data)
      
      // Set default MIME type if not provided
      const fileType = mimeType || 'text/plain'
      
      // Sanitize filename for Android file system
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      
      if (Platform.OS === 'android') {
        try {
          // For Android, write base64 to file first, then share the file
          const tempPath = `${RNFS.CachesDirectoryPath}/${sanitizedFilename}`
          
          console.log('Android: Writing file to', tempPath)
          
          await RNFS.writeFile(tempPath, fileBase64, 'base64')
          
          // Verify file was written
          const fileExists = await RNFS.exists(tempPath)
          if (!fileExists) {
            throw new Error('Failed to write temporary file')
          }
          
          console.log('Android: File written successfully, sharing...')
          
          await Share.open({
            title: filename,
            message: filename,
            url: `file://${tempPath}`,
            type: fileType,
            filename: sanitizedFilename,
            failOnCancel: false,
            showAppsToView: true,
            saveToFiles: true,
          })
          
          // Clean up temp file
          setTimeout(() => {
            RNFS.unlink(tempPath).catch(console.warn)
          }, 5000)
        } catch (androidError) {
          console.log('Android file approach failed, trying fallback:', androidError.message)
          
          // Fallback: try using react-native's built-in Share.share (no file, just text)
          const textContent = atob(fileBase64) // Convert back to text for sharing
          
          await RNShare.share({
            title: filename,
            message: `File: ${filename}\n\n${textContent}`,
          })
        }
      } else {
        // iOS can handle data URLs directly
        const url = `data:${fileType};base64,${fileBase64}`
        
        await Share.open({
          title: filename,
          message: filename,
          url: url,
          type: fileType,
          filename: filename,
          failOnCancel: false,
          showAppsToView: true,
          saveToFiles: true,
        })
      }
    } catch (error) {
      console.error("Error downloading file:", error)
      Alert.alert(
        "Download Error", 
        `Failed to download file: ${error.message}`,
        [{ text: "OK" }]
      )
    }
  }

  const confirmLightning = async (amount) => {
    Alert.alert(
      translate("SendBitcoinConfirmationScreen.confirmPayment"),
      translate(
        "SendBitcoinConfirmationScreen.areYouSure", 
        {
          satAmount: formatCurrencyAmount({sats: Number(amount * 100000000), currency: "BTC"}),
          fiatAmount: formatCurrencyAmount({sats: amount * 100000000, currency: "USD"}),
        }
      ), 
      [
        {
          text: translate("common.cancel"),
          onPress: () => console.log('canceled'),
          style: 'cancel',
        },
        {
          text: translate("common.ok"),
          onPress: async () => {
            setTimeout(() => {
              const js = `
                window.dispatchEvent(new CustomEvent("userConfirmed"));

                true;
              `;
              this.webview.injectJavaScript(js);
            }, 250)
          }
        },
      ]
    );
  }

  useEffect(() => {
    if(Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackButtonPress)
      return () => {
        backHandler.remove()
      }
    }
  }, [canGoBack])

  return (
    <Screen>
      <View style={{flex: 1, backgroundColor: colors.background}}>
        {mySatBalance !== null &&
          <WebView
            ref={(ref) => (this.webview = ref)}
            style={{backgroundColor: colors.background}}
            source={{
              uri: `${otcBaseUri.url}?key=E4WE5GgDr6g8HFyS4K4m5rdJ&fromBJ=true&phone=${encodeURIComponent(phoneNumber)}&username=${encodeURIComponent(username)}&lang=${userPreferredLanguage}&satBalance=${mySatBalance}${(orderNbr ? `#/order/${orderNbr}` : '')}`,
              headers: {
                'x-bj-wallet': "true",
              },
            }}
            onMessage={async (event) => {
              const data = JSON.parse(event.nativeEvent.data)

              switch(data.action) {
                case "confirm":
                  await confirmLightning(data.amount)

                  break;

                case "invoice":
                  const invoice = data.bolt11
                  await payLightning(invoice)

                  break;

                case "createInvoice":
                  await createInvoice(data.satAmount)

                  break;

                case "complete":
                  Alert.alert(data.title, data.subtext)
                  // analytics().logScreenView({
                  //   screen_name: "sinpeConfirmationScreen",
                  //   screen_class: "sinpeConfirmationScreen",
                  // })
                  navigation.navigate("moveMoney")

                  break;

                case "sendSms":
                  sendMessage(data)
                  break;

                case "clickLink":
                  console.log(data)
                  Linking.openURL(data.url)
                  break;

                case "downloadFile":
                  await downloadFile(data.data, data.filename, data.mimeType)
                  break;

                case "shareImage":
                  try {
                    if (Platform.OS === 'android') {
                      // For Android, write base64 to file first, then share the file
                      const base64Data = data.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                      const tempPath = `${RNFS.CachesDirectoryPath}/${data.filename}`;
                      
                      await RNFS.writeFile(tempPath, base64Data, 'base64');
                      
                      await Share.open({
                        url: `file://${tempPath}`,
                        type: data.mimeType,
                        filename: data.filename,
                        failOnCancel: false,
                        showAppsToView: true,
                        saveToFiles: true,
                      });
                      
                      // Clean up temp file
                      setTimeout(() => {
                        RNFS.unlink(tempPath).catch(console.warn);
                      }, 5000);
                    } else {
                      // iOS can handle data URLs directly
                      await Share.open({
                        url: data.dataUrl,
                        type: data.mimeType,
                        filename: data.filename,
                        failOnCancel: false,
                        showAppsToView: true,
                        saveToFiles: true,
                      });
                    }
                  } catch (error) {
                    console.error('Share error:', error);
                  }
                  break;
              }
            }}
            allowsBackForwardNavigationGestures={true}
            injectedJavaScript={runFirst}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack)
            }}
            sharedCookiesEnabled={true}
            basicAuthCredential={{
              username: otcBaseUri.username,
              password: otcBaseUri.password
            }}
          />
        }
      </View>
    </Screen>
  )
}
