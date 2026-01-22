import React from 'react'
import type { CalculationResult } from './types'
import { formatNumber } from '../../lib/utils';
import { type ChartConfig } from '../ui/chart';
import { Area, AreaChart, Bar, BarChart, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../ui/button';
import Results from './result';
import ResultChart from './resultChart';
import { v4 } from 'uuid';



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

export default function ResultsSection({ results = null }: { results: CalculationResult[] | null }) {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)


  return (
    <div className='w-full flex gap-4 flex-row flex-wrap max-w-full'>
      {results && results.map((result, index) => (
        <React.Fragment key={result.attacker + (result.weapon || '') + result.defender}>
          <div className='w-full h-full'>
            <div className='ml-2 mb-2 font-semibold text-lg'>
              {result.attacker} {result.weapon} vs {result.defender}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full' key={v4()}>

              <ResultChart label="attacks" array={result.attacks || []} />

              <ResultChart label="hits" array={result.hits || []} />
              <ResultChart label="wounds" array={result.wounds || []} />
              <ResultChart label="saves" array={result.unsaved || []} />
              {result.mortalWounds.length > 1 && (
                <>
                  <ResultChart label="damage" array={result.damage || []} />
                  <ResultChart label="mortalWounds" array={result.mortalWounds || []} />
                </>
              )
              }
              <ResultChart label="totalDamage" array={result.damage || []} />
            </div>
          </div>
          {index < results.length - 1 && <div className="w-full my-2 border-b border-card-surface" />}
        </React.Fragment>
      ))}
    </div>
  )
}
