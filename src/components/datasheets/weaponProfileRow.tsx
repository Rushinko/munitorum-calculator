import React from 'react'
import { defaultWeaponProfileModifiers, WeaponProfile, WeaponProfileModifiers, WeaponStats } from './types';
import { Badge } from '../ui/badge';
import { camelCaseToString, findDiff } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Edit, EllipsisIcon, Trash } from 'lucide-react';
import ModifiersDialog from './weaponModifiersDialog';
import { Input } from '../ui/input';
import ModifierChip from './modifierChip';

type WeaponProfileRowProps = {
  profile: WeaponProfile;
  handleUpdateWeaponProfile: (id: string, field: keyof Omit<WeaponProfile, 'id'>, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdateWeaponModifiers: (id: string, value: Partial<WeaponProfileModifiers>) => void;
  handleRemoveProfile: (id: string) => void;
  statKeys: (keyof WeaponStats)[];
  statHeaders: string[];
}

export default function WeaponProfileRow({ profile, handleUpdateWeaponProfile, handleUpdateWeaponModifiers, handleRemoveProfile, statKeys, statHeaders }: WeaponProfileRowProps) {
  const [dropdownOpen, setDropdownOpen] = React.useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  // Dynamic grid template to match the number of stats exactly
  const gridTemplateColumns = `minmax(0, 2.5fr) repeat(${statKeys.length}, minmax(2.5rem, 1fr)) 2.5rem`;

  return (
    <div key={profile.id} className="rounded-lg transition-colors">

      {/* --- Main Profile Row (replaces TableRow) --- */}
      <div className="grid gap-1 md:gap-2 items-center" style={{ gridTemplateColumns }}>

        {/* Name Input (replaces TableCell) */}
        <div>
          <Input
            type="text"
            name="name"
            value={profile.name}
            onChange={(e) => handleUpdateWeaponProfile(profile.id, 'name', e)}
            placeholder="Weapon Name"
            className="!text-xs md:text-sm"
          />
        </div>

        {/* Stat Inputs (replaces mapping TableCells) */}
        {statKeys.map((statKey, index) => (
          <div key={statKey} className="text-center">
            <Input
              className='!text-xs md:text-sm text-center px-1'
              type="text"
              name={statKey}
              value={profile[statKey]}
              onChange={e => handleUpdateWeaponProfile(profile.id, statKey, e)}
            />
          </div>
        ))}

        {/* Actions (replaces TableCell) */}
        <div className="flex justify-center items-center pb-0.5 md:pb-0">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <EllipsisIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit bg-background z-100">
              <DropdownMenuItem asChild>
                <Button variant="ghost"
                  size="sm"
                  aria-label="Weapon Modifiers"
                  className='w-full justify-start'
                  onClick={() => setDialogOpen(true)}
                >
                  <Edit className='h-4 w-4' />
                  Modifiers
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Remove Profile"
                  className='w-full justify-start'
                  onClick={() => handleRemoveProfile(profile.id)}
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ModifiersDialog
          open={dialogOpen}
          setOpen={setDialogOpen}
          updateModifier={handleUpdateWeaponModifiers}
          id={profile.id}
          modifiers={profile.modifiers}
        />
      </div>

      {/* ---- [NEW] MODIFIERS ROW (OPTIONAL) ---- */}
      {
        profile.modifiers && Object.keys(profile.modifiers).length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1 border-t border-dashed border-accent">
            {
              Object.keys(findDiff(defaultWeaponProfileModifiers, profile.modifiers)).map((key) => (
                <ModifierChip
                  key={key}
                  modifier={key}
                  value={profile.modifiers[key as keyof WeaponProfileModifiers] as boolean | number | string}
                />
              ))
            }
          </div>
        )
      }

    </div>
  )
}
