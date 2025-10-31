import React from 'react'
import type { CalculationResult } from './types'
import { formatNumber } from '../../lib/utils';
import { ChartContainer, type ChartConfig } from '../ui/chart';
import { Bar, BarChart, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../ui/button';
import Results from './result';



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

export default function ResultsSection({ results = null }: { results: CalculationResult | null }) {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)


  const { hits: hitsArray, wounds: woundsArray, unsaved: savesArray } = results || {};

  return (
    <div className='w-full flex gap-4 flex-row overflow-wrap max-w-full'>
      <Button onClick={forceUpdate}>Redraw</Button>
      <div className='flex flex-col min-w-60 min-h-60'>
        <Results label="Hits" array={results?.hits || []} />
      </div>
      <div className='flex flex-col min-w-60 min-h-60'>
        <h4 className='text-lg font-bold'>Wounds</h4>
        <div className='flex p-2 h-80 min-w-full border rounded-lg'>
          <ChartContainer config={chartConfig}>
            <ComposedChart data={woundsArray}>
              <Bar dataKey="exact" fill={chartConfig.exact.color} yAxisId="right" />
              <Line yAxisId="left" type="monotone" dataKey="orHigher" stroke={chartConfig.orHigher.color} />
              <XAxis dataKey="" />
              <YAxis yAxisId="left" dataKey="orHigher" />
              <YAxis yAxisId="right" dataKey="exact" orientation='right' />
              <Tooltip />
            </ComposedChart>
          </ChartContainer>
        </div>
      </div>
      {/* <div className='flex flex-col'>
        <h4 className='text-lg font-bold'>Damage per Model</h4>
        <p>{damagePerModel}</p>
      </div>
      <div className='flex flex-col'>
        <h4 className='text-lg font-bold'>Total Damage</h4>
        <p>{totalDamage}</p>
      </div> */}
    </div>
  )
}
