import React from 'react'
import { ModeToggle } from '../modeToggle'
import { LogoButton } from './button'

export default function AppBar() {
  return (
    <header className="sticky px-6 top-0 z-20 w-full mask-to-t border-accent backdrop-blur-sm">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between  ">
        <LogoButton size="lg" />
        <ModeToggle />
      </div>
    </header>
  )
}
