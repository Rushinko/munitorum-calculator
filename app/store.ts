import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { defaultDatasheet, defaultDatasheetModifiers, type Datasheet } from "../src/components/datasheets/types";
import { v4 as uuidv4 } from 'uuid';
import type { DatasheetActions, DatasheetModifiers, WeaponProfile } from "../src/components/datasheets/types";
import type { CalculationResult } from "../src/components/calculator/types";

type ToolsState = {
  modifiers: DatasheetModifiers,
  attackersIds: string[],
  defendersIds: string[],
  datasheets: Datasheet[],
  results: CalculationResult[] | null,
}

type ToolsActions = {
  addDatasheet: () => string;
  removeDatasheet: (datasheetId: string) => void;
  datasheetActions: DatasheetActions;
  addAttacker: (datasheetId: string) => void;
  addDefender: (datasheetId: string) => void;
  setResults: (results: CalculationResult[]) => void;
  updateModifiers: (modifiers: DatasheetModifiers) => void;
}

type ToolsStore = ToolsState & ToolsActions;

const useToolsStore = create<ToolsStore>()(immer((set) => {
  const initialDefenderId = uuidv4();
  const initialAttackerId = uuidv4();
  return ({
    modifiers: defaultDatasheetModifiers,
    attackersIds: [initialAttackerId],
    defendersIds: [initialDefenderId],
    datasheets: [{ id: initialAttackerId, ...defaultDatasheet }, { id: initialDefenderId, ...defaultDatasheet }],
    results: null,
    addDatasheet: () => {
      const newId = uuidv4();
      set(state => {
        state.datasheets.push({ id: newId, ...defaultDatasheet });
      });
      return newId;
    },
    removeDatasheet: (datasheetId) => set(state => ({
      datasheets: state.datasheets.filter((ds: Datasheet) => ds.id !== datasheetId)
    })),
    datasheetActions: {
      updateDatasheet: (datasheetId, data) => set(state => ({
        datasheets: state.datasheets.map((ds: Datasheet) =>
          ds.id === datasheetId ? { ...ds, ...data } : ds
        )
      })),
      updateDatasheetStat: (datasheetId, stat, value) => {
        set(state => {
          const datasheet = state.datasheets.find((ds: Datasheet) => ds.id === datasheetId);
          if (datasheet?.stats) {
            (datasheet.stats[stat] as typeof value) = value;
          }
        });
      },
      updateDatasheetField: (datasheetId, field, value) => {
        set(state => {
          const datasheet = state.datasheets.find((ds: Datasheet) => ds.id === datasheetId);
          if (datasheet) {
            (datasheet[field] as typeof value) = value;
          }
        });
      },
      deleteDatasheet: (datasheetId) => set(state => {
        state.datasheets = state.datasheets.filter((ds: Datasheet) => ds.id !== datasheetId);
        state.attackersIds = state.attackersIds.filter((id: string) => id !== datasheetId);
        state.defendersIds = state.defendersIds.filter((id: string) => id !== datasheetId);
      }),
      addWeaponProfile: (datasheetId) => set(state => ({
        datasheets: state.datasheets.map((ds: Datasheet) =>
          ds.id === datasheetId
            ? {
              ...ds, weaponProfiles: [...ds.weaponProfiles,
              {
                id: uuidv4(),
                name: '',
                attacks: '0',
                weaponSkill: 0,
                strength: 0,
                armorPenetration: 0,
                damage: '0',
                modifiers: {
                  twinLinked: false,
                  lethalHits: false,
                  devastatingWounds: false,
                  sustainedHits: 0,
                  criticalWounds: 0,
                },
              }]
            }
            : ds
        )
      })),
      removeWeaponProfile: (datasheetId, profileId) => set(state => {
        const datasheet = state.datasheets.find((ds: Datasheet) => ds.id === datasheetId);
        if (!datasheet) return;
        datasheet.weaponProfiles = datasheet.weaponProfiles.filter((p: WeaponProfile) => p.id !== profileId);
      }),
      updateWeaponProfile: (datasheetId, profileId, field, value) => {
        set(state => {
          const datasheet = state.datasheets.find((ds: Datasheet) => ds.id === datasheetId);
          if (!datasheet) return;
          const profile = datasheet.weaponProfiles.find((p: WeaponProfile) => p.id === profileId);
          if (!profile) return;
          (profile[field] as typeof value) = value;
        })
      }
    },
    addAttacker: (datasheetId) => set(state => ({
      attackersIds: [...state.attackersIds, datasheetId]
    })),
    addDefender: (datasheetId) => set(state => ({
      defendersIds: [...state.defendersIds, datasheetId]
    })),
    setResults: (results) => set(state => ({
      results: results
    })),
    updateModifiers: (modifiers) => set(state => ({
      modifiers: modifiers
    })),

  })
}));

export default useToolsStore;
