'use client'

import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Edit } from 'lucide-react'
import { type WeaponProfileModifiers } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { useState } from 'react'
import { camelCaseToString } from '@/lib/utils'
import { randomUUID } from 'crypto'
import { v4 } from 'uuid'

type ModifierDialogProps = {
  modifiers: Partial<WeaponProfileModifiers>;
  id: string
  updateModifier: (key: string, value: any) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function ModifiersDialog({ modifiers, id, updateModifier, open, setOpen }: ModifierDialogProps) {

  const handleUpdateModifier = (key: string, value: any) => {
    const newModifiers = { ...modifiers, [key]: value };
    updateModifier(id, newModifiers);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-8">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Modifiers</DialogTitle>
        </DialogHeader>
        <div className='grid grid-cols-3 gap-4 justify-evenly'>
          {
            Object.keys(modifiers).filter(key => typeof modifiers[key as keyof WeaponProfileModifiers] === 'boolean').map((key) => (
              <div key={key} className="flex flex-row grow gap-2 rounded-lg items-center text-center mb-4">
                <Toggle
                  aria-label={key}
                  className='data-[state=on]:bg-primary data-[state=off]:bg-muted h-8 grow-2 px-3 rounded-lg'
                  id={key}
                  name={key}
                  pressed={modifiers[key as keyof WeaponProfileModifiers] as boolean}
                  onPressedChange={(value) => handleUpdateModifier(key, value)}
                >
                  {key === 'devastatingWounds' ? 'Dev Wounds' : camelCaseToString(key)}
                </Toggle>
              </div>

            ))}
        </div>
        <div className='grid grid-cols-2 gap-4 justify-evenly'>
          {
            Object.keys(modifiers).filter(key => typeof modifiers[key as keyof WeaponProfileModifiers] === 'number').map((key) => (


              <div className='flex  flex-col items-start' key={v4()}>
                <Label htmlFor={key} className='text-end text-sm flex justify-end '>
                  {camelCaseToString(key)}
                </Label> 
                <Input
                  id={key}
                  name={key}
                  type="number"
                  className='grow flex text-center border border-input rounded px-2'
                  value={modifiers[key as keyof WeaponProfileModifiers] as number}
                  onChange={(e) => handleUpdateModifier(key, parseInt(e.target.value) || 0)}
                />
              </div>
            )
            )}

        </div>
        <div className='flex w-full justify-end'>
          <DialogClose className='' asChild>
            <Button size="default">Save</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
