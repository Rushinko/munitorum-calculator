import React from 'react'
import type { CalculationResult } from './types'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart'
import { Area, AreaChart, Bar, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts'
import type { DiceProbability } from '../../lib/probability'
import { Card } from '../ui/card'
import { v4 as uuid} from 'uuid'
import { camelCaseToString } from '@/lib/utils'



const chartConfig = {
  exact: {
    label: "Exact",
    color: "#2563eb",
  },
  orHigher: {
    label: "Or Higher",
    color: "#60a5fa",
  },
} satisfies ChartConfig

type ResultChartProps = React.ComponentProps<"div"> & {
  label: string;
  array: DiceProbability[];
}
export default function ResultChart({ label, array }: ResultChartProps) {

  return (
    <Card className='w-full flex flex-col bg-card-surface'>
      <div className='flex mx-auto'>{camelCaseToString(label)}</div>
      <ChartContainer config={chartConfig} className='max-h-50'>
        <ComposedChart
          data={array}
        >
          <XAxis dataKey="roll" />
          <YAxis yAxisId="left" dataKey="orHigher" domain={[0, 1]} />
          <YAxis yAxisId="right" dataKey="exact" orientation='right' />
          <ChartTooltip
            content={<ChartTooltipContent />}
            position={{ x: 0, y: 0 }}
          />
          <Bar yAxisId="right" dataKey="exact" fill={chartConfig.exact.color} />
          <Area yAxisId="left" type="monotone" dataKey="orHigher" stroke={chartConfig.orHigher.color} />
        </ComposedChart>
      </ChartContainer>
    </Card>
  )
}
