import React, { memo } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import ResultsSection from './resultsSection';
import { CalculationResult } from './types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const MemoizedResultsSection = memo(ResultsSection);

export default function ResultsCard({ results }: { results: CalculationResult[] | null }) {
  return (
    <Card className='w-full'>
      <Tabs defaultValue='graph'>
        <CardHeader>
          <span className='flex flex-row items-center'>

            <h2 className="text-xl font-bold mx-2">Results</h2>
            <TabsList>
              <TabsTrigger value='graph'>
                Graph
              </TabsTrigger>
              <TabsTrigger value='table'>
                Table
              </TabsTrigger>
            </TabsList>
          </span>
        </CardHeader>
        <CardContent>
          <TabsContent value='graph'>
            <MemoizedResultsSection results={results} />
          </TabsContent>
          <TabsContent value='table'>
            <div>Coming soon...</div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
