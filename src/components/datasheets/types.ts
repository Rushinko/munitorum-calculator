
export type Datasheet = {
  id: string;
  name: string;
  models: number;
  stats: DatasheetStats;
  open?: boolean;
  weaponProfiles: WeaponProfile[];
};

export type DatasheetModifiers = {
  cover: boolean;
  hitModifier: number;
  woundModifier: number;
  rerollHits: 'none' | 'fails' | 'ones' | 'non-crits';
  rerollWounds: 'none' | 'fails' | 'ones' | 'non-crits';
  rerollSaves: 'none' | 'fails' | 'ones' | 'non-crits';
  sustainedHits: number;
  lethalHits: boolean;
  criticalHits: number;
  criticalWounds: number;
  devastatingWounds: boolean;
}

export type WeaponProfileModifiers = {
  twinLinked: boolean;
  lethalHits: boolean;
  devastatingWounds: boolean;
  sustainedHits: number;
  criticalWounds: number;
}

export type ConsolidatedModifiers = DatasheetModifiers & WeaponProfileModifiers;

export type DatasheetStats = {
  movement: number;
  toughness: number;
  save: number;
  invulnerableSave: number;
  wounds: number;
  feelNoPain: number;
}

export type WeaponProfile = {
  id: string;
  name: string;
  attacks: string;
  weaponSkill: number;
  strength: number;
  armorPenetration: number;
  damage: string;
  modifiers: Partial<WeaponProfileModifiers>;
};

export type WeaponStats = Omit<WeaponProfile, 'id' | 'name' | 'modifiers'>;

export type DatasheetActions = {
  updateDatasheet: (datasheetId: string, data: Partial<Datasheet>) => void;
  updateDatasheetField: (datasheetId: string, field: keyof Datasheet, value: Datasheet[typeof field]) => void;
  updateDatasheetStat: (datasheetId: string, stat: keyof DatasheetStats, value: string | number) => void;
  deleteDatasheet?: (datasheetId: string) => void;
  addWeaponProfile: (datasheetId: string) => void;
  removeWeaponProfile: (datasheetId: string, profileId: string) => void;
  updateWeaponProfile: (datasheetId: string, profileId: string, field: keyof Omit<WeaponProfile, 'id'>, value: string | number) => void;
}



const defaultDatasheetStat: DatasheetStats = {
  movement: 0,
  toughness: 0,
  save: 0,
  invulnerableSave: 0,
  wounds: 0,
  feelNoPain: 0,
}

export const defaultDatasheetModifiers: DatasheetModifiers = {
  rerollHits: 'none',
  rerollWounds: 'none',
  rerollSaves: 'none',
  hitModifier: 0,
  woundModifier: 0,
  sustainedHits: 0,
  criticalHits: 0,
  criticalWounds: 0,
  cover: false,
  lethalHits: false,
  devastatingWounds: false,
}

export const defaultWeaponProfileModifiers: WeaponProfileModifiers = {
  twinLinked: false,
  lethalHits: false,
  devastatingWounds: false,
  sustainedHits: 0,
  criticalWounds: 0,
}

export const defaultDatasheet: Omit<Datasheet, 'id'> = {
  name: 'New Datasheet',
  models: 1,
  stats: defaultDatasheetStat,
  open: true,
  weaponProfiles: [],
};

export enum DatasheetStatShorthand {
  movement = 'M',
  toughness = 'T',
  wounds = 'W',
  save = 'Sv',
  invulnerableSave = 'InvSv',
  feelNoPain = 'FNP',
}

export const omitKeys = (key: string) => key !== 'id' && key !== 'name' && key !== 'weaponProfiles';
