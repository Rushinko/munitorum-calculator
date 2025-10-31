import React from 'react'
import type { DatasheetModifiers } from './types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { camelCaseToString } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Toggle } from '@/components/ui/toggle';
import { boolean } from 'mathjs';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

type ModifiersTableProps = {
  modifiers: DatasheetModifiers;
  updateModifiers: (modifiers: DatasheetModifiers) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function ModifiersSection({ modifiers, updateModifiers, open, setOpen }: ModifiersTableProps) {

  const handleUpdateModifier = (key: string, value: any) => {
    updateModifiers({ ...modifiers, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl ">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Global Modifiers</DialogTitle>
        </DialogHeader>
        <div className='flex flex-wrap flex-row gap-4 p-4 justify-evenly'>
          {Object.keys(modifiers).filter(key => typeof modifiers[key as keyof DatasheetModifiers] !== 'boolean').map((key) => (
            <div key={key} className="flex flex-row gap-2 justify-end items-center text-center">
              {typeof modifiers[key as keyof DatasheetModifiers] === 'boolean' ? (
                <Toggle
                  aria-label={key}
                  className='data-[state=on]:bg-primary data-[state=off]:bg-muted data-[state=off]:hover:bg-card-surface h-8 px-3 rounded-lg'
                  id={key}
                  variant={'outline'}
                  name={key}
                  pressed={modifiers[key as keyof DatasheetModifiers] as boolean}
                  onPressedChange={(value) => handleUpdateModifier(key, value)}
                >
                  {camelCaseToString(key)}
                </Toggle>
              ) : typeof modifiers[key as keyof DatasheetModifiers] === 'number' ? (
                <div className='grid w-full max-w-sm items-center'>
                  <Label htmlFor={key} className='mb-1 text-start flex justify-start '>
                    {camelCaseToString(key)}
                  </Label>
                  <Input
                    id={key}
                    name={key}
                    type="number"
                    className='max-w-28 flex text-center'
                    value={modifiers[key as keyof DatasheetModifiers] as number}
                    onChange={(e) => handleUpdateModifier(key, parseInt(e.target.value, 10))}
                  />
                </div>
              ) : (
                <div className='grid w-full max-w-sm items-center'>
                  <Label htmlFor={key} className=' text-start text-xs flex justify-start '>
                    {camelCaseToString(key)}
                  </Label>
                  <Select value={modifiers[key as keyof DatasheetModifiers] as string} onValueChange={(value) => handleUpdateModifier(key, value)}>
                    <SelectTrigger className='w-28 max-w-28'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent >
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                      <SelectItem value="ones">Ones</SelectItem>
                      {
                        key !== 'rerollSaves' && <SelectItem value="non-crits">Non-Crits</SelectItem>
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
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
