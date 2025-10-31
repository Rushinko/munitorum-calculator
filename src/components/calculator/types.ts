import type { DiceProbability, Probabilities } from "../../lib/probability";

export type CalculationResult = {
  attacker?: string;
  defender?: string;
  weapon?: string;
  attacks: number | DiceProbability[]
  mortalWounds: DiceProbability[]
  hits: DiceProbability[];
  wounds: DiceProbability[];
  unsaved: DiceProbability[];
  devastatingWounds: DiceProbability[];
  damage: DiceProbability[];
  totalDamage: DiceProbability[];
};

export type SaveStageResult = {
  unsavedNormalWounds: DiceProbability[];
  devastatingWounds: DiceProbability[];
  totalUnsaved: DiceProbability[];
};

export type VariableDiceResult = {
  numDice: number;
  sides: number;
  bonus: number;
};

export type DamageStageResult = {
  mortalDamage: DiceProbability[];
  normalDamage: DiceProbability[];
  totalDamage: DiceProbability[];
};