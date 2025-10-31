import React from 'react'
import type { CalculationResult } from './types'
import { ChartContainer, type ChartConfig } from '../ui/chart'
import { Bar, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts'
import type { DiceProbability } from '../../lib/probability'


const chartConfig = {
  exact: {
    label: "Exact",
    color: "#2563eb",
  },
  orHigher: {
    label: "At Least",
    color: "#60a5fa",
  },
} satisfies ChartConfig

type ResultChartProps = React.ComponentProps<"div"> & {
  array: DiceProbability[];
}
export default function ResultChart({ array }: ResultChartProps) {

  return (
    <ChartContainer config={chartConfig}>
      <ComposedChart data={array}>
        <Bar dataKey="exact" fill={chartConfig.exact.color} yAxisId="right" />
        <Line yAxisId="left" type="monotone" dataKey="orHigher" stroke={chartConfig.orHigher.color} />
        <XAxis dataKey="" />
        <YAxis yAxisId="left" dataKey="orHigher" />
        <YAxis yAxisId="right" dataKey="exact" orientation='right' />
        <Tooltip />
      </ComposedChart>
    </ChartContainer>
  )
}
