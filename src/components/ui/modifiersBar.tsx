import React from 'react'
import { ModeToggle } from '../modeToggle'
import { LogoButton } from './button'
import ModifiersSection from '../datasheets/modifiersSection'
import { DatasheetModifiers } from '../datasheets/types'

type ModifiersBarProps = React.ComponentProps<"header"> & {
  modifiers: DatasheetModifiers;
  updateModifiers: (modifiers: DatasheetModifiers) => void;
}

        export default function ModifiersBar({ modifiers, updateModifiers }: ModifiersBarProps) {
  return (
    <header className="sticky px-6 top-0 z-20 w-full border-accent backdrop-blur-sm">
      <div className="container flex h-fit max-w-7xl mx-auto items-center justify-between  ">
        <ModifiersSection modifiers={modifiers} updateModifier={updateModifiers} />
      </div>
    </header>
  )
}
