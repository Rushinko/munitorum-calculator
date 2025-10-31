import React from 'react'
import { Card, CardContent, CardDescription } from './card'
import { Info } from 'lucide-react';

type ErrorCardProps = React.ComponentProps<typeof Card> & {
  className?: string;
  message?: string;
  children?: React.ReactNode;
}

export default function ErrorCard({ message, children, className }: ErrorCardProps) {
  return (
    <div className={`bg-error/50 text-destructive-foreground w-64 flex items-center p-4 rounded-md shadow-md ${className}`}>
      {message}
    </div>
  )
}
