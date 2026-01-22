import type { Datasheet, DatasheetModifiers, WeaponProfile } from "@/components/datasheets/types";
import { convolve, trimInsignificantProbabilities, type DiceProbability, getDiceSumDistribution } from "./probability";
import type { CalculationResult, VariableDiceResult } from "@/components/calculator/types";

// --- Helpers ---

export function parseDice(damage: string): VariableDiceResult {
  const clean = damage.trim().toUpperCase();
  // Matches "D6", "2D6", "2D6+3", "D6+1"
  const diceMatch = clean.match(/^(\d*)D(\d+)(?:\+(\d+))?$/);
  if (diceMatch) {
    return {
      numDice: diceMatch[1] ? parseInt(diceMatch[1], 10) : 1,
      sides: parseInt(diceMatch[2], 10),
      bonus: diceMatch[3] ? parseInt(diceMatch[3], 10) : 0
    };
  }
  // Matches flat "3"
  if (/^\d+$/.test(clean)) {
    return { numDice: 0, sides: 0, bonus: parseInt(clean, 10) };
  }
  return { numDice: 0, sides: 0, bonus: 0 };
}

const getWoundTarget = (strength: number, toughness: number, modifiers: DatasheetModifiers): number => {
  let target = 5;
  if (strength >= 2 * toughness) target = 2;
  else if (strength > toughness) target = 3;
  else if (strength === toughness) target = 4;
  else if (strength * 2 <= toughness) target = 6;

  target -= modifiers.woundModifier;
  return Math.max(2, Math.min(6, target));
};

function getSuccessProbability(targetValue: number, sides: number): number {
  if (targetValue <= 1) return 1.0;
  if (targetValue > sides) return 0.0;
  return (sides - targetValue + 1) / sides;
}

/**
 * Formats a raw probability array into the DiceProbability[] structure.
 */
function formatProbabilities(exactProbs: number[]): DiceProbability[] {
  const result: DiceProbability[] = new Array(exactProbs.length);
  let cumulative = 0;
  // Iterate backwards to calculate 'orHigher'
  for (let i = exactProbs.length - 1; i >= 0; i--) {
    const p = exactProbs[i] || 0;
    cumulative += p;
    if (cumulative > 1) cumulative = 1;
    result[i] = { exact: p, orHigher: cumulative, roll: i };
  }
  return result;
}

/**
 * Calculates the distribution of a sum of random variables, where the *number* of variables
 * is itself a random variable.
 * 
 * @param countDist The distribution of the number of items (e.g., number of Attacks).
 * @param unitDist The distribution of a single item (e.g., hits from 1 Attack die).
 */
function getCompoundDistribution(countDist: DiceProbability[], unitDist: number[]): number[] {
  // If the unit distribution is deterministic (e.g., always 0), result is 0.
  if (unitDist.length === 1 && unitDist[0] === 1) return [1];

  const maxCount = countDist.length - 1;
  const maxUnitVal = unitDist.length - 1;
  const maxTotal = maxCount * maxUnitVal;
  
  // Initialize result array
  const finalDist = new Float64Array(maxTotal + 1);

  // Optimization: Iterative convolution.
  // We compute unitDist^n iteratively.
  // currentUnitDist holds the distribution of the sum of 'n' units.
  let currentUnitDist = [1.0]; // n=0

  for (let n = 0; n <= maxCount; n++) {
    const probOfCountN = countDist[n]?.exact ?? 0;

    if (probOfCountN > 0) {
      // Add the weighted probabilities of this specific count to the total
      for (let i = 0; i < currentUnitDist.length; i++) {
        finalDist[i] += currentUnitDist[i] * probOfCountN;
      }
    }

    // Prepare for next iteration (n+1) by convolving one more unit
    if (n < maxCount) {
      currentUnitDist = convolve(currentUnitDist, unitDist);
    }
  }

  return Array.from(finalDist);
}

function getSingleDamageRollDistribution(profile: VariableDiceResult): number[] {
  if (profile.numDice === 0) {
    const dist = new Array(profile.bonus + 1).fill(0);
    dist[profile.bonus] = 1.0;
    return dist;
  }

  const diceSumDist = getDiceSumDistribution(profile.numDice, profile.sides);
  if (profile.bonus === 0) return diceSumDist.map(p => p.exact);

  const finalDist = new Array(diceSumDist.length + profile.bonus).fill(0);
  for (let i = 0; i < diceSumDist.length; i++) {
    finalDist[i + profile.bonus] = diceSumDist[i].exact;
  }
  return finalDist;
}

// --- Stages ---

function processHitStage(
  attackDist: DiceProbability[],
  sides: number,
  hitValue: number,
  modifiers: DatasheetModifiers
): DiceProbability[] {
  if (hitValue === 0) return attackDist; // Auto-hit

  // 1. Calculate the distribution of hits for a SINGLE die
  const pSuccess = getSuccessProbability(hitValue, sides);
  const critTarget = modifiers.criticalHits > 0 ? modifiers.criticalHits : sides;
  let pCrit = getSuccessProbability(critTarget, sides);
  let pNormal = Math.max(0, pSuccess - pCrit);
  let pMiss = 1 - pNormal - pCrit;

  // Apply Rerolls
  if (modifiers.rerollHits) {
    let pReroll = 0;
    if (modifiers.rerollHits === 'fails') pReroll = pMiss;
    else if (modifiers.rerollHits === 'ones') pReroll = 1 / sides;
    else if (modifiers.rerollHits === 'non-crits') pReroll = pNormal + pMiss;

    pCrit += pReroll * pCrit;
    pNormal += pReroll * pNormal;
    pMiss = 1 - pCrit - pNormal;
  }

  const sustainedHits = modifiers.sustainedHits || 0;
  const maxHitsPerDie = 1 + sustainedHits;
  
  // Construct single die distribution: [Prob(0 hits), Prob(1 hit), ..., Prob(max hits)]
  const singleDieDist = new Array(maxHitsPerDie + 1).fill(0);
  singleDieDist[0] = pMiss;
  if (pNormal > 0) singleDieDist[1] += pNormal;
  if (pCrit > 0) singleDieDist[1 + sustainedHits] += pCrit;

  // 2. Calculate total hits using compound distribution
  const totalHitsExact = getCompoundDistribution(attackDist, singleDieDist);
  return formatProbabilities(totalHitsExact);
}

function processWoundStage(
  hitDist: DiceProbability[],
  sides: number,
  hitValue: number,
  woundValue: number,
  modifiers: DatasheetModifiers
): DiceProbability[] {
  // Calculate effective wound probability per Hit
  // Lethal Hits: Hit -> Auto-Wound (100%)
  // Normal Hit: Hit -> Wound Roll (pWound)
  
  const pSuccessHit = getSuccessProbability(hitValue, sides);
  if (pSuccessHit === 0) return formatProbabilities([1]); // No hits possible

  const critHitTarget = (modifiers.criticalHits && modifiers.criticalHits > 0) ? modifiers.criticalHits : sides;
  const pCritHit = getSuccessProbability(critHitTarget, sides);
  
  // Probability that a successful hit was a Critical Hit (Lethal)
  const pLethalGivenHit = (modifiers.lethalHits && hitValue > 0) ? (pCritHit / pSuccessHit) : 0;
  
  // Probability of wounding on a normal hit
  let pWoundOnNormal = getSuccessProbability(woundValue, sides);

  // Apply Wound Rerolls (only applies to the wound roll, not lethal hits)
  if (modifiers.rerollWounds) {
    const pFailWound = 1 - pWoundOnNormal;
    let pReroll = 0;
    if (modifiers.rerollWounds === 'fails') pReroll = pFailWound;
    else if (modifiers.rerollWounds === 'ones') pReroll = 1 / sides;
    
    pWoundOnNormal += pReroll * pWoundOnNormal;
  }

  // Effective probability that a generic "Hit" becomes a "Wound"
  // = P(Lethal) * 1 + P(Normal) * P(WoundRoll)
  const pEffectiveWound = pLethalGivenHit + (1 - pLethalGivenHit) * pWoundOnNormal;

  // Single Hit -> Wound distribution [Fail, Success]
  const singleHitToWoundDist = [1 - pEffectiveWound, pEffectiveWound];

  const totalWoundsExact = getCompoundDistribution(hitDist, singleHitToWoundDist);
  return formatProbabilities(totalWoundsExact);
}

type SaveAndDamageStageResult = {
  devastatingWounds: DiceProbability[];
  unsavedNormalWounds: DiceProbability[];
  totalUnsaved: DiceProbability[];
  mortalDamage: DiceProbability[];
  normalDamage: DiceProbability[];
  totalDamage: DiceProbability[];
};

function processSaveAndDamageStage(
  woundDist: DiceProbability[],
  sides: number,
  hitValue: number,
  woundValue: number,
  saveValue: number,
  damageProfile: VariableDiceResult,
  modifiers: DatasheetModifiers
): SaveAndDamageStageResult {
  // 1. Determine probabilities for specific wound outcomes
  
  // Reconstruct Hit/Wound probabilities to determine composition of wound pool
  // (Lethal Hits vs Normal Wounds) to correctly apply Devastating Wounds.
  const pSuccessHit = getSuccessProbability(hitValue, sides);
  
  // Lethal Hits (Auto-Wounds) - Auto-hits (hitValue 0) cannot be Critical Hits
  const critHitTarget = (modifiers.criticalHits && modifiers.criticalHits > 0) ? modifiers.criticalHits : sides;
  const pCritHit = getSuccessProbability(critHitTarget, sides);
  const pLethalGivenHit = (modifiers.lethalHits && hitValue > 0 && pSuccessHit > 0) ? (pCritHit / pSuccessHit) : 0;

  // Wound Rolls
  let pWoundOnNormal = getSuccessProbability(woundValue, sides);
  const critWoundTarget = (modifiers.criticalWounds && modifiers.criticalWounds > 0) ? modifiers.criticalWounds : sides;
  let pCritWound = getSuccessProbability(critWoundTarget, sides);

  if (modifiers.rerollWounds) {
    const pFailWound = 1 - pWoundOnNormal;
    let pReroll = 0;
    if (modifiers.rerollWounds === 'fails') pReroll = pFailWound;
    else if (modifiers.rerollWounds === 'ones') pReroll = 1 / sides;
    
    pWoundOnNormal += pReroll * pWoundOnNormal;
    pCritWound += pReroll * getSuccessProbability(critWoundTarget, sides);
  }

  const pEffectiveWound = pLethalGivenHit + (1 - pLethalGivenHit) * pWoundOnNormal;
  const pEffectiveDevastating = (modifiers.devastatingWounds) ? (1 - pLethalGivenHit) * pCritWound : 0;

  const pDevastatingGivenWound = (pEffectiveWound > 0) 
    ? pEffectiveDevastating / pEffectiveWound 
    : 0;

  const pFailSave = 1 - getSuccessProbability(saveValue, sides);

  // Calculate effective probabilities for a single Wound die:
  // A: Becomes Devastating (Mortal)
  const pA = pDevastatingGivenWound;
  // B: Becomes Normal Unsaved (Normal -> Fail Save)
  const pB = (1 - pDevastatingGivenWound) * pFailSave;
  // C: Becomes Saved (Normal -> Save)
  // const pC = (1 - pDevastatingGivenWound) * (1 - pFailSave);

  // 2. Calculate Count Distributions
  // We use the Compound method. For "Devastating Wounds Count", the unit distribution is [1-pA, pA].
  const devWoundsExact = getCompoundDistribution(woundDist, [1 - pA, pA]);
  const unsavedNormalExact = getCompoundDistribution(woundDist, [1 - pB, pB]);
  
  // For Total Unsaved (Damage Events), the probability is pA + pB
  const totalUnsavedExact = getCompoundDistribution(woundDist, [1 - (pA + pB), pA + pB]);

  // 3. Calculate Damage Distributions
  const singleDamageDist = getSingleDamageRollDistribution(damageProfile);

  const mortalDamageExact = getCompoundDistribution(formatProbabilities(devWoundsExact), singleDamageDist);
  const normalDamageExact = getCompoundDistribution(formatProbabilities(unsavedNormalExact), singleDamageDist);
  const totalDamageExact = getCompoundDistribution(formatProbabilities(totalUnsavedExact), singleDamageDist);

  return {
    devastatingWounds: trimInsignificantProbabilities(formatProbabilities(devWoundsExact)),
    unsavedNormalWounds: trimInsignificantProbabilities(formatProbabilities(unsavedNormalExact)),
    totalUnsaved: trimInsignificantProbabilities(formatProbabilities(totalUnsavedExact)),
    mortalDamage: trimInsignificantProbabilities(formatProbabilities(mortalDamageExact)),
    normalDamage: trimInsignificantProbabilities(formatProbabilities(normalDamageExact)),
    totalDamage: trimInsignificantProbabilities(formatProbabilities(totalDamageExact)),
  };
}

// --- Main Entry Point ---

export function calculateAttackSequence(
  attacker: Datasheet,
  attacks: VariableDiceResult,
  defender: Datasheet,
  weapon: WeaponProfile,
  sides: number,
  hitValue: number,
  woundValue: number,
  saveValue: number,
  modifiers: DatasheetModifiers,
  isVariableAttacks: boolean = false,
): CalculationResult {
  
  // 1. Determine Attack Distribution
  let attackDist: DiceProbability[];
  
  if (attacks.numDice === 0) {
    // Fixed number of attacks
    const total = attacks.bonus * attacker.models;
    attackDist = formatProbabilities(new Array(total + 1).fill(0).map((_, i) => i === total ? 1 : 0));
  } else {
    // Variable number of attacks (e.g. D6)
    // Get distribution for one model, then convolve for N models? 
    // Or just sum dice? getDiceSumDistribution handles N dice.
    // Total Dice = models * attacks.numDice
    const totalDice = attacker.models * attacks.numDice;
    const totalBonus = attacker.models * attacks.bonus;
    
    const diceDist = getDiceSumDistribution(totalDice, attacks.sides);
    
    // Shift by bonus
    const exact = new Array(diceDist.length + totalBonus).fill(0);
    for(let i=0; i<diceDist.length; i++) {
      exact[i + totalBonus] = diceDist[i].exact;
    }
    attackDist = formatProbabilities(exact);
  }

  // 2. Pipeline
  const hitProbabilities = processHitStage(attackDist, sides, hitValue, modifiers);
  
  const woundProbabilities = processWoundStage(hitProbabilities, sides, hitValue, woundValue, modifiers);
  
  const finalResult = processSaveAndDamageStage(
    woundProbabilities,
    sides,
    hitValue,
    woundValue,
    saveValue,
    parseDice(weapon.damage),
    modifiers
  );

  return {
    isVariableAttacks: isVariableAttacks,
    attacks: trimInsignificantProbabilities(attackDist),
    hits: trimInsignificantProbabilities(hitProbabilities),
    wounds: trimInsignificantProbabilities(woundProbabilities),
    devastatingWounds: finalResult.devastatingWounds,
    unsaved: finalResult.unsavedNormalWounds,
    mortalWounds: finalResult.mortalDamage,
    damage: finalResult.normalDamage,
    totalDamage: finalResult.totalDamage,
  };
}

/**
 * @deprecated Use calculateAttackSequence directly. It now handles variable attacks natively.
 */
export function calculateVariableAttackSequence(
  attacker: Datasheet,
  attacks: VariableDiceResult,
  defender: Datasheet,
  weapon: WeaponProfile,
  sides: number,
  hitValue: number,
  woundValue: number,
  saveValue: number,
  modifiers: DatasheetModifiers,
): CalculationResult {
  // the isVarialbeAttacks param = true
  return calculateAttackSequence(attacker, attacks, defender, weapon, sides, hitValue, woundValue, saveValue, modifiers, true);
}
