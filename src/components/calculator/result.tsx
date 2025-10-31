import React from 'react'
import ResultChart from './resultChart';
import type { CalculationResult } from './types';
import type { DiceProbability } from '../../lib/probability';

type ResultsProps = React.ComponentProps<"div"> & {
  label: string;
  array: DiceProbability[];
}

export default function Results(props: ResultsProps) {
  return (
    <div>
      <div>{props.label}</div>
      <ResultChart array={props.array} />
    </div>
  )
}
