import { defaultDatasheetModifiers, type ConsolidatedModifiers, type Datasheet, type DatasheetModifiers, type WeaponProfileModifiers } from "../components/datasheets/types";

export const getDatasheetStatString = (datasheet: Datasheet) => {
  return `T${datasheet.stats.toughness} W${datasheet.stats.wounds}  ${datasheet.stats.save}+ ${datasheet.stats.invulnerableSave}++ ${datasheet.stats.feelNoPain ? datasheet.stats.feelNoPain + '+++' : ''}`.trim();
};

export function calculateConsolidatedModifiers(
  dMods: Partial<DatasheetModifiers> = {},
  wMods: Partial<WeaponProfileModifiers> = {}
): DatasheetModifiers {

  // Use ?? to fall back to the defaults, not the partial inputs
  const defaults = defaultDatasheetModifiers as DatasheetModifiers;

  // Handle "reroll" logic separately to find the "best" available option
  const rerollHits = dMods.rerollHits || 'none';

  const rerollWounds = dMods.rerollWounds === 'fails' || wMods.twinLinked ? 'fails'
    : dMods.rerollWounds === 'non-crits' ? 'non-crits'
      : dMods.rerollWounds === 'ones' ? 'ones'
        : 'none'

  return {
    // --- Unique Datasheet Props ---
    // Use the value from dMods if it exists, otherwise use the default.
    cover: dMods.cover ?? defaults.cover,
    hitModifier: dMods.hitModifier ?? defaults.hitModifier,
    woundModifier: dMods.woundModifier ?? defaults.woundModifier,
    rerollHits: rerollHits,
    rerollWounds: rerollWounds,
    rerollSaves: dMods.rerollSaves ?? defaults.rerollSaves,


    
    // Boolean OR: (If either is true, the result is true)
    lethalHits: (dMods.lethalHits ?? false) || (wMods.lethalHits ?? false),
    devastatingWounds: (dMods.devastatingWounds ?? false) || (wMods.devastatingWounds ?? false),
    
    // "Best Of" / Minimum: (e.g., Crit on 5+ is better than Crit on 6+)
    sustainedHits: Math.max(dMods.sustainedHits ?? 0, wMods.sustainedHits ?? 0),
    criticalHits: dMods.criticalHits || defaults.criticalHits,
    criticalWounds: Math.min(
      dMods.criticalWounds || 6,
      wMods.criticalWounds || 6
    ),
  };
}