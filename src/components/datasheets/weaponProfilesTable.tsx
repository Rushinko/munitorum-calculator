'use client'

import React from 'react'
// Imports for Badge added, Table components removed
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { defaultWeaponProfileModifiers, type DatasheetModifiers, type WeaponProfile, type WeaponProfileModifiers, type WeaponStats } from './types'
import { Button } from '@/components/ui/button'
import { EllipsisIcon, Plus, PlusCircle, Trash } from 'lucide-react'
import ModifiersDialog from './weaponModifiersDialog'
import { camelCaseToString, findDiff } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import WeaponProfileRow from './weaponProfileRow'



type WeaponProfilesListProps = {
  profiles: WeaponProfile[];
  onProfileChange: (id: string, name: keyof Omit<WeaponProfile, 'id'>, e: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileRemove: (id: string) => void;
  onModifierChange: (id: string, value: any) => void;
}

// Define stat keys explicitly to avoid iterating over 'id', 'name', or 'modifiers'
const statKeys: (keyof WeaponStats)[] = ['attacks', 'weaponSkill', 'strength', 'armorPenetration', 'damage'];
const statHeaders = ['A', 'WS', 'S', 'AP', 'D'];

// Renamed component to reflect it's no longer a table
export default function WeaponProfilesList({ profiles, onProfileChange, onModifierChange, onProfileRemove }: WeaponProfilesListProps) {

  const [dropdownOpen, setDropdownOpen] = React.useState<boolean>(false);
  const handleUpdateWeaponProfile = (id: string, name: keyof Omit<WeaponProfile, 'id'>, e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Updating profile:', id, name, e.target.value);
    onProfileChange(id, name, e);
  };

  const handleUpdateWeaponModifiers = (id: string, value: any) => {
    console.log(profiles)
    onModifierChange(id, value);
  };

  const handleRemoveProfile = (id: string) => {
    onProfileRemove(id);
  };

  // Dynamic grid template to match the row exactly
  const gridTemplateColumns = `minmax(0, 2.5fr) repeat(${statKeys.length}, minmax(2.5rem, 1fr)) 2.5rem`;

  return (
    <div className="space-y-2 w-full">
      {/* ---- HEADERS ---- */}
      <div className="grid gap-1 md:gap-2 items-center border-b border-input pb-2" style={{ gridTemplateColumns }}>
        <div className="text-xs md:text-sm pl-3 font-semibold text-muted-foreground uppercase">Name</div>
        {statHeaders.map(header => (
          <div key={header} className="text-xs px-1 md:text-sm font-semibold text-muted-foreground uppercase text-center">{header}</div>
        ))}
        {/* Spacer for actions column */}
        <div className="w-10" aria-hidden="true" />
      </div>

      {/* ---- PROFILES LIST (replaces TableBody) ---- */}
      <div className="space-y-2 overflow-x-auto">
        {profiles.map((profile) => (
          <WeaponProfileRow
            key={profile.id}
            profile={profile}
            statKeys={statKeys}
            statHeaders={statHeaders}
            handleUpdateWeaponProfile={handleUpdateWeaponProfile}
            handleUpdateWeaponModifiers={handleUpdateWeaponModifiers}
            handleRemoveProfile={handleRemoveProfile}
          />
        ))}
      </div>
    </div >
  )
}
