import type { CalculationResult, VariableDiceResult } from "../src/components/calculator/types";
import type { Datasheet, DatasheetModifiers, WeaponProfile } from "../src/components/datasheets/types";
import { calculateAttackSequence, calculateVariableAttackSequence, parseDice } from "../src/lib/calculatorUtils";
import { calculateConsolidatedModifiers } from "../src/lib/datasheetUtils";
import {  type DiceProbability } from "../src/lib/probability";

type SaveStageResult = {
  unsavedNormalWounds: DiceProbability[];
  devastatingWounds: DiceProbability[];
  totalUnsaved: DiceProbability[];
};

const SIDES = 6;


/**
 * Determines the target number needed to wound a target based on the attacker's strength and the target's toughness.
 * @param strength The strength of the attacking unit.
 * @param toughness The toughness of the defending unit.
 * @param modifiers Any modifiers that may affect the wound calculation.
 * @returns The target number needed to successfully wound the target.
 */
const getWoundTarget = (strength: number, toughness: number, modifiers: DatasheetModifiers): number => {
  let ret;
  if (strength >= 2 * toughness) ret = 2;
  else if (strength > toughness) ret = 3;
  else if (strength === toughness) ret = 4;
  else if (strength * 2 <= toughness) ret = 6;
  else ret = 5;
  if (modifiers.woundModifier > 0 || modifiers.woundModifier < 0) {
    ret -= modifiers.woundModifier;
    if (ret < 2) ret = 2;
    if (ret > 6) ret = 6;
  }
  return ret;
};

export const runCalculation = (attackers: Datasheet[], defenders: Datasheet[], modifiers: DatasheetModifiers): CalculationResult[] | null => {
  const results: CalculationResult[] = [];
  attackers.forEach(attacker => {
    defenders.forEach(defender => {
      attacker.weaponProfiles.forEach(weapon => {
        const attacks = parseDice(weapon.attacks.toString());
        const isVariableAttacks = (!(attacks?.numDice === 0 || attacks === null || attacks.numDice === undefined) && attacks?.numDice > 0);
        const effectiveSave = Math.min(defender.stats.save + Math.abs(weapon.armorPenetration), defender.stats.invulnerableSave === 0 ? 7 : defender.stats.invulnerableSave);
        const woundTarget = getWoundTarget(weapon.strength, defender.stats.toughness, modifiers);
        const hitTarget = Math.max(2, Math.min(6, weapon.weaponSkill - (modifiers.hitModifier || 0)));
        const consolidatedModifiers = calculateConsolidatedModifiers(modifiers, weapon.modifiers);
        let result: CalculationResult;
        if (isVariableAttacks) {
          result = calculateVariableAttackSequence(
            attacker,
            attacks as VariableDiceResult,
            defender,
            weapon,
            SIDES,
            hitTarget,
            woundTarget,
            effectiveSave,
            consolidatedModifiers
          );
        }
        else {
          result = calculateAttackSequence(
            attacker,
            attacks as VariableDiceResult,
            defender,
            weapon,
            SIDES,
            hitTarget,
            woundTarget,
            effectiveSave,
            consolidatedModifiers
          );
        }
        
        result.attacker = attacker.name;
        result.defender = defender.name;
        result.weapon = weapon.name;
        results.push(result);
      });
    });
  });
  console.log("Full calculation results:", results);
  return results.length > 0 ? results : null;
};

