import React from 'react'
import type { CalculationResult } from './types'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart'
import { Area, Bar, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts'
import type { DiceProbability } from '../../lib/probability'
import { Card } from '../ui/card'
import ResultChart from './resultChart'


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
  label: string;
  result: CalculationResult;
}
export default function Result({ result, label }: ResultChartProps) {

  return (
    <div className='grid grid-cols-3 gap-4'>
      <ResultChart label="hits" array={result.hits || []} />
      <ResultChart label="wounds" array={result.wounds || []} />
      <ResultChart label="saves" array={result.unsaved || []} />
      <ResultChart label="damage" array={result.damage || []} />
    </div>
  )
}
