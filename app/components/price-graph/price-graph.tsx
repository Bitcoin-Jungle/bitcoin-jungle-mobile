import { gql, useQuery } from "@apollo/client"
import * as React from "react"
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryScatter,
  VictoryVoronoiContainer,
} from "victory-native"
import * as currency_fmt from "currency.js"
import { parseDate, formatDate } from "../../utils/date"
import { color } from "../../theme"
import { palette } from "../../theme/palette"
import { translate } from "../../i18n"
import type { ComponentType } from "../../types/jsx"

const BTC_PRICE_LIST = gql`
  query btcPriceList($range: PriceGraphRange!) {
    btcPriceList(range: $range) {
      timestamp
      price {
        base
        offset
        currencyUnit
        formattedAmount
      }
    }
  }
`

const multiple = (currentUnit: string) => {
  switch (currentUnit) {
    case "USDCENT":
      return 10 ** -5
    default:
      return 1
  }
}

const Graph_Range = {
  ONE_DAY: "ONE_DAY",
  ONE_WEEK: "ONE_WEEK",
  ONE_MONTH: "ONE_MONTH",
  ONE_YEAR: "ONE_YEAR",
} as const

type GraphRangeType = typeof Graph_Range[keyof typeof Graph_Range]

type Price = {
  base: number
  offset: number
  currencyUnit: string
  formattedAmount: string
}

type PricePoint = {
  timestamp: number
  price: Price
}

export const PriceGraphDataInjected: ComponentType = () => {
  const [graphRange, setGraphRange] = React.useState<GraphRangeType>(Graph_Range.ONE_DAY)

  const { error, loading, data, refetch } = useQuery(BTC_PRICE_LIST, {
    variables: { range: graphRange },
    notifyOnNetworkStatusChange: true,
  })

  if (loading || data === null) {
    return <ActivityIndicator animating size="large" color={palette.lightBlue} />
  }

  if (error) {
    return <Text>{`${error}`}</Text>
  }

  const lastPrice = data.btcPriceList[data.btcPriceList.length - 1]
  if (!loading) {
    const unixTime = Date.now() / 1000
    if (graphRange === Graph_Range.ONE_DAY) {
      if (unixTime - lastPrice.timestamp > 300) {
        refetch()
      }
    } else if (graphRange === Graph_Range.ONE_WEEK) {
      if (unixTime - lastPrice.timestamp > 1800) {
        refetch()
      }
    } else if (graphRange === Graph_Range.ONE_MONTH) {
      if (unixTime - lastPrice.timestamp > 86400) {
        refetch()
      }
    } else if (graphRange === Graph_Range.ONE_YEAR) {
      if (unixTime - lastPrice.timestamp > 86400) {
        refetch()
      }
    }
  }

  return (
    <PriceGraph
      prices={data.btcPriceList}
      graphRange={graphRange}
      setGraphRange={setGraphRange}
    />
  )
}

type Props = {
  graphRange: GraphRangeType
  prices: PricePoint[]
  setGraphRange: (graphRange: GraphRangeType) => void
}

export const PriceGraph: ComponentType = ({
  graphRange,
  prices,
  setGraphRange,
}: Props) => {
  let price
  let delta
  let strokeColor

  const [selectedPoint, setSelectedPoint] = React.useState<
    | {
        timestamp: number
        price: Price
      }
    | null
  >(null)

  React.useEffect(() => {
    setSelectedPoint(null)
  }, [graphRange])

  const formatPrice = (price: number) => {
    return currency_fmt
      .default(price, { precision: 2, symbol: "₡", separator: ".", decimal: "," })
      .format()
  }

  try {
    const currentPriceData = prices[prices.length - 1].price
    const startPriceData = prices[0].price

    price =
      (currentPriceData.base / 10 ** currentPriceData.offset) *
      multiple(currentPriceData.currencyUnit)
    delta =
      (price -
        (startPriceData.base / 10 ** startPriceData.offset) *
          multiple(startPriceData.currencyUnit)) /
      price
    strokeColor = delta > 0 ? palette.green : palette.red
  } catch (err) {
    return <ActivityIndicator animating size="large" color={palette.lightBlue} />
  }

  const label = () => {
    switch (graphRange) {
      case Graph_Range.ONE_DAY:
        return translate("PriceScreen.today")
      case Graph_Range.ONE_WEEK:
        return translate("PriceScreen.thisWeek")
      case Graph_Range.ONE_MONTH:
        return translate("PriceScreen.thisMonth")
      case Graph_Range.ONE_YEAR:
        return translate("PriceScreen.thisYear")
    }
  }

  const buttonStyleForRange = (
    buttonGraphRange: GraphRangeType,
  ): StyleProp<ViewStyle> => {
    return graphRange === buttonGraphRange
      ? styles.buttonStyleTimeActive
      : styles.buttonStyleTime
  }
  const titleStyleForRange = (titleGraphRange: GraphRangeType): StyleProp<TextStyle> => {
    return graphRange === titleGraphRange ? null : styles.titleStyleTime
  }

  const chartData = prices.map((point) => ({
    x: point.timestamp,
    y:
      (point.price.base / 10 ** point.price.offset) *
      multiple(point.price.currencyUnit),
    price: point.price,
  }))

  const latestPriceDisplay = (() => {
    const latest = prices[prices.length - 1].price
    // Keep display consistent with existing selected calculation (× 1000)
    return (
      (latest.base / 10 ** latest.offset) * multiple(latest.currencyUnit) * 1000
    )
  })()

  const selectedY = selectedPoint
    ?
      (selectedPoint.price.base / 10 ** selectedPoint.price.offset) *
      multiple(selectedPoint.price.currencyUnit)
    : null

  return (
    <View style={styles.container}>
      <Pressable style={styles.topContainer} onPress={() => setSelectedPoint(null)}>
        {!selectedPoint && (
          <View style={styles.headerWrapper}>
            <View style={styles.priceRow}>
              <Text style={styles.currentPrice}>{formatPrice(latestPriceDisplay)}</Text>
              <View
                style={[
                  styles.deltaPill,
                  { backgroundColor: strokeColor + "33" },
                ]}
              >
                <Text style={[styles.deltaText, { color: strokeColor }]}>
                  {delta > 0 ? "▲" : "▼"} {(delta * 100).toFixed(2)}%
                </Text>
              </View>
            </View>
            <Text style={styles.periodText}>{label()}</Text>
          </View>
        )}
        {selectedPoint && (
          <View style={styles.headerWrapper}>
            <Text style={styles.selectedMeta}>
              {formatDate({ createdAt: selectedPoint.timestamp, showFullDate: true })}
            </Text>
            <Text style={styles.selectedPrice}>
              {formatPrice(
                (selectedPoint.price.base / 10 ** selectedPoint.price.offset) *
                  multiple(selectedPoint.price.currencyUnit) *
                  1000,
              )}
            </Text>
          </View>
        )}
      </Pressable>
      <View style={styles.chartContainer}>
        <VictoryChart
          width={Dimensions.get("window").width}
          height={Dimensions.get("window").height * 0.55}
          padding={{ top: 10, bottom: 40, left: 0, right: 0 }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension="x"
              onActivated={(points) => {
                if (points && points.length > 0) {
                  setSelectedPoint({
                    timestamp: (points[0] as any)["_x"],
                    price: (points[0] as any).price,
                  })
                }
              }}
              // Keep selection after touch end; do not clear on deactivate
              onDeactivated={() => {}}
            />
          }
        >
          <VictoryAxis dependentAxis style={{ axis: { stroke: "transparent" } }} tickFormat={() => ""} />
          <VictoryAxis style={{ axis: { stroke: "transparent" } }} tickFormat={() => ""} />
          <VictoryArea
            data={chartData}
            interpolation="monotoneX"
            style={{
              data: {
                stroke: strokeColor,
                strokeWidth: 2.5,
                fill: strokeColor + "22",
              },
            }}
            animate={{ duration: 700, easing: "quadInOut" }}
          />
          <VictoryLine
            data={chartData}
            interpolation="monotoneX"
            style={{ data: { stroke: strokeColor, strokeWidth: 2.5 } }}
            animate={{ duration: 700, easing: "quadInOut" }}
          />
          {selectedPoint && selectedY !== null && (
            <VictoryScatter
              data={[
                {
                  x: selectedPoint.timestamp,
                  y: selectedY,
                },
              ]}
              size={5}
              style={{ data: { fill: strokeColor, strokeWidth: 0 } }}
            />
          )}
        </VictoryChart>
      </View>
      <View style={styles.segmentedContainer}>
        {[
          { key: Graph_Range.ONE_DAY, label: translate("PriceScreen.oneDay") },
          { key: Graph_Range.ONE_WEEK, label: translate("PriceScreen.oneWeek") },
          { key: Graph_Range.ONE_MONTH, label: translate("PriceScreen.oneMonth") },
          { key: Graph_Range.ONE_YEAR, label: translate("PriceScreen.oneYear") },
        ].map(({ key, label: title }) => {
          const isActive = graphRange === key
          return (
            <Pressable
              key={key}
              style={[styles.segment, isActive ? styles.segmentActive : styles.segmentInactive]}
              onPress={() => setGraphRange(key)}
            >
              <Text style={[styles.segmentText, isActive ? styles.segmentTextActive : styles.segmentTextInactive]}>
                {title}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = EStyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  
  topContainer: {
    paddingTop: '6rem',
    paddingHorizontal: '16rem',
  },

  chartContainer: {
    width: '100%',
    height: Dimensions.get("window").height * 0.35,
  },

  delta: {
    fontSize: '18rem',
    fontWeight: 'bold',
  },

  neutral: {
    color: palette.darkGrey,
    fontSize: '18rem',
  },

  textView: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: '10rem',
  },

  titleStyleTime: {
    color: palette.midGrey,
  },

  headerWrapper: {
    alignItems: 'center',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8rem',
  },

  currentPrice: {
    color: palette.lightBlue,
    fontSize: '28rem',
    fontWeight: '700',
  },

  deltaPill: {
    paddingHorizontal: '10rem',
    paddingVertical: '4rem',
    borderRadius: '999rem',
  },

  deltaText: {
    fontSize: '14rem',
    fontWeight: '600',
  },

  periodText: {
    marginTop: '4rem',
    color: palette.midGrey,
    fontSize: '14rem',
  },

  selectedMeta: {
    color: palette.midGrey,
    fontSize: '14rem',
  },

  selectedPrice: {
    fontSize: '24rem',
    fontWeight: '700',
    color: palette.lightBlue,
    textAlign: 'center',
    marginTop: '4rem',
  },

  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.transparent,
    paddingHorizontal: '16rem',
    paddingBottom: '16rem',
    gap: '8rem',
  },

  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: '8rem',
    borderRadius: '999rem',
  },

  segmentActive: {
    backgroundColor: palette.lightBlue,
  },

  segmentInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  segmentText: {
    fontSize: '14rem',
    fontWeight: '600',
  },

  segmentTextActive: {
    color: color.background,
  },

  segmentTextInactive: {
    color: palette.midGrey,
  },
})
