import type { Datasheet, DatasheetModifiers, WeaponProfile } from "~/components/datasheets/types";
import { convolve, convolvePower, getBinomialDistribution, getCumulativeProbabilities, getDiceProbabilities, getDiceSumDistribution, trimInsignificantProbabilities, type DiceProbability } from "./probability";
import type { CalculationResult, DamageStageResult, SaveStageResult, VariableDiceResult } from "~/components/calculator/types";


export function parseDice(damage: string): VariableDiceResult {
  const cleanString = damage.trim().toUpperCase();
  const diceRegex = /^(\d*)D(\d+)(?:\+(\d+))?$/;
  const match = cleanString.match(diceRegex);
  if (match) {
    const numDice = match[1] === '' ? 1 : parseInt(match[1], 10);
    const sides = match[2] === '' ? 0 : parseInt(match[2], 10);
    const bonus = match[3] === '' || match[3] === undefined ? 0 : parseInt(match[3], 10);
    return { numDice, sides, bonus };
  }
  const flatRegex = /^\d+$/;
  if (cleanString.match(flatRegex)) {
    return { numDice: 0, sides: 0, bonus: parseInt(cleanString, 10) };
  }
  return { numDice: 0, sides: 0, bonus: 0 }; // Default to 0 damage if parsing fails
};



function getSingleDamageRollDistribution(profile: VariableDiceResult): number[] {
  // --- Handle static damage (e.g., { numDice: 0, bonus: 3 }) ---
  if (profile.numDice === 0) {
    const dist = new Array(profile.bonus + 1).fill(0);
    dist[profile.bonus] = 1.0; // 100% chance to do exactly 'bonus' damage
    return dist;
  }

  // --- Handle variable damage (e.g., { numDice: 1, sides: 6, bonus: 3 }) ---
  const diceSumDist = getDiceSumDistribution(profile.numDice, profile.sides);

  // If there's no bonus, we're done
  if (profile.bonus === 0) {
    return diceSumDist.map(p => p.exact);
  }

  // If there is a bonus, shift the distribution to the right
  const finalDist = new Array(diceSumDist.length + profile.bonus).fill(0);
  for (let i = 0; i < diceSumDist.length; i++) {
    finalDist[i + profile.bonus] = diceSumDist[i].exact;
  }
  return finalDist;
}

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
  if (modifiers.woundModifier !== 0) {
    ret -= modifiers.woundModifier;
    if (ret < 2) ret = 2;
    if (ret > 6) ret = 6;
  }
  return ret;
};

/**
 * Calculates the probability of rolling a target value or higher on a die.
 * e.g., a 4+ on a d6 is getSuccessProbability(4, 6) = 3/6 = 0.5.
 */
function getSuccessProbability(targetValue: number, sides: number): number {
  if (targetValue <= 1) return 1.0;
  if (targetValue > sides) return 0.0;
  return (sides - targetValue + 1) / sides;
}

/**
 * Creates a probability distribution for an auto-success event.
 */
function createAutoSuccessDistribution(count: number): DiceProbability[] {
  const distribution: DiceProbability[] = Array(count + 1);
  for (let i = 0; i <= count; i++) {
    distribution[i] = {
      exact: (i === count) ? 1.0 : 0.0,
      orHigher: 1.0,
    };
  }
  return distribution;
}

/**
 * Recalculates the 'orHigher' probabilities from the 'exact' ones.
 */
function recalculateOrHigher(probabilities: DiceProbability[]): void {
  let cumulativeProb = 0;
  for (let i = probabilities.length - 1; i >= 0; i--) {
    cumulativeProb += probabilities[i].exact;
    probabilities[i].orHigher = cumulativeProb;
  }
}


function processHitStage(
  attacks: number,
  sides: number,
  hitValue: number,
  modifiers: DatasheetModifiers
): DiceProbability[] {
  if (hitValue === 0) {
    return createAutoSuccessDistribution(attacks);
  }

  // Sustained Hits requires the convolution method.
  if (modifiers.sustainedHits && modifiers.sustainedHits > 0) {
    const pSuccess = getSuccessProbability(hitValue, sides);
    const critTarget = modifiers.criticalHits > 0 ? modifiers.criticalHits : sides;
    let pCrit = getSuccessProbability(critTarget, sides);
    let pNormal = Math.max(0, pSuccess - pCrit);
    let pMiss = 1 - pNormal - pCrit;

    // This calculates the final probabilities of a single die after a re-roll attempt.
    if (modifiers.rerollHits === 'fails') {
      const pRerollTrigger = pMiss; // We re-roll on any miss
      pCrit += pRerollTrigger * pCrit;
      pNormal += pRerollTrigger * pNormal;
      pMiss = 1 - pCrit - pNormal; // Recalculate the final miss chance
    } else if (modifiers.rerollHits === 'ones') {
      // do not need to check if the hitValue > 1 because a 1 always fails
      const pRerollTrigger = 1 / sides; // The probability of rolling a 1
      pCrit += pRerollTrigger * pCrit;
      pNormal += pRerollTrigger * pNormal;
      pMiss = 1 - pCrit - pNormal; // Recalculate the final miss chance

    }
    else if (modifiers.rerollHits === 'non-crits') {
      const pRerollTrigger = pNormal + pMiss; // We re-roll on any non-crit
      pCrit += pRerollTrigger * pCrit;
      pNormal += pRerollTrigger * pNormal;
      pMiss = 1 - pCrit - pNormal; // Recalculate the final miss chance
    }

    const numBonusHits = modifiers.sustainedHits;
    const maxHitsFromOneDie = 1 + numBonusHits;

    // Create the distribution for a SINGLE die using the FINAL (post-reroll) probabilities.
    const singleDieDistribution = new Array(maxHitsFromOneDie + 1).fill(0);
    singleDieDistribution[0] = pMiss;
    if (pNormal > 0) { singleDieDistribution[1] = pNormal; }
    if (pCrit > 0) { singleDieDistribution[maxHitsFromOneDie] = pCrit; }

    // Convolve the distribution for the total number of attacks.
    const exactProbabilities = convolvePower(singleDieDistribution, attacks);

    // Convert the result into the DiceProbability[] format.
    const hitProbabilities: DiceProbability[] = exactProbabilities.map(p => ({ exact: p, orHigher: 0 }));
    recalculateOrHigher(hitProbabilities);
    let probSum = 0;
    for (let i = 0; i < hitProbabilities.length; i++) {
      probSum += hitProbabilities[i].exact;
    }
    console.log(hitProbabilities.length);
    console.log(probSum);
    return hitProbabilities;

  } else {
    // This part already works correctly! The getDiceProbabilities function handles
    // re-rolls for the standard (non-sustained) hit calculation.
    return getDiceProbabilities(attacks, sides, hitValue, modifiers.rerollHits);
  }
}

function processWoundStage(
  hitProbabilities: DiceProbability[],
  sides: number,
  hitValue: number,
  woundValue: number,
  modifiers: DatasheetModifiers
): DiceProbability[] {
  const attacks = hitProbabilities.length - 1;
  // Standard calculation: apply wound probability to the distribution of hits.
  if (!modifiers.lethalHits) {
    return getCumulativeProbabilities(hitProbabilities, woundValue, attacks, sides, modifiers.rerollWounds);
  }

  // --- Lethal Hits Logic ---
  const critTarget = (modifiers.criticalHits && modifiers.criticalHits > 0) ? modifiers.criticalHits : sides;
  const pSuccessHit = getSuccessProbability(hitValue, sides);

  if (pSuccessHit === 0) { // Avoid division by zero if hits are impossible
    const emptyDist = new Array(attacks + 1).fill(0).map(() => ({ exact: 0, orHigher: 0 }));
    emptyDist[0].orHigher = 1.0;
    return emptyDist;
  }

  const pCritHit = getSuccessProbability(critTarget, sides);
  const pCritGivenSuccess = pCritHit / pSuccessHit;

  let pWoundOnNormalHit = getSuccessProbability(woundValue, sides);

  const maxWounds = hitProbabilities.length - 1;
  const finalWoundProbs = new Array(maxWounds + 1).fill(0);

  // For each possible number of hits...
  for (let numHits = 1; numHits <= maxWounds; numHits++) {
    const probOfThisManyHits = hitProbabilities[numHits].exact;
    if (probOfThisManyHits === 0) continue;

    // ...calculate the distribution of how many of those hits were criticals.
    const critDistribution = getBinomialDistribution(numHits, pCritGivenSuccess);

    for (let numCrits = 0; numCrits <= numHits; numCrits++) {
      const probOfThisManyCrits = critDistribution[numCrits];
      if (probOfThisManyCrits === 0) continue;

      const numNormalHits = numHits - numCrits;

      // For the remaining normal hits, calculate the distribution of successful wounds.
      const normalWoundDistribution = getBinomialDistribution(numNormalHits, pWoundOnNormalHit);

      for (let numNormalWounds = 0; numNormalWounds <= numNormalHits; numNormalWounds++) {
        const probOfThisManyNormalWounds = normalWoundDistribution[numNormalWounds];
        if (probOfThisManyNormalWounds === 0) continue;

        const totalWounds = numCrits + numNormalWounds; // Auto-wounds + normal wounds
        finalWoundProbs[totalWounds] += probOfThisManyHits * probOfThisManyCrits * probOfThisManyNormalWounds;
      }
    }
  }

  finalWoundProbs[0] = hitProbabilities[0]?.exact ?? 0;
  let totalProb = finalWoundProbs.reduce((sum, p) => sum + p, 0);
  finalWoundProbs[0] += (1 - totalProb); // Account for rounding errors and the 0-hit case.

  const woundDistribution: DiceProbability[] = finalWoundProbs.map(p => ({ exact: p, orHigher: 0 }));
  recalculateOrHigher(woundDistribution);

  return woundDistribution;
}

function processDamageStage(
  devastatingWoundsDist: DiceProbability[],
  unsavedNormalWoundsDist: DiceProbability[],
  damageProfile: VariableDiceResult
): DamageStageResult {

  // Get the probability distribution for a single instance of damage.
  const singleDamageDist = getSingleDamageRollDistribution(damageProfile);

  // This helper function does the core work for one type of wound (mortal or normal)
  const calculateTotalDamageDist = (woundDistribution: DiceProbability[]): number[] => {
    if (woundDistribution.length === 0) return [0]; // No wounds means no damage
    const maxWounds = woundDistribution.length - 1;
    // Calculate the max possible damage to size the array correctly
    const maxDamageFromOneRoll = damageProfile.numDice !== 0 ? singleDamageDist.length - 1 : damageProfile.bonus;
    const maxTotalDamage = maxWounds * maxDamageFromOneRoll;
    const finalDamageProbs = new Array(maxTotalDamage + 1).fill(0);

    // For each possible number of successful wounds...
    for (let k = 0; k <= maxWounds; k++) {
      const probOfKWounds = woundDistribution[k]?.exact ?? 0;
      if (probOfKWounds === 0) continue;

      // Calculate the damage distribution for k wounds using convolution
      const damageDistForKWounds = convolvePower(singleDamageDist, k);

      // Add the weighted probabilities to our final result
      for (let d = 0; d < damageDistForKWounds.length; d++) {
        finalDamageProbs[d] += probOfKWounds * damageDistForKWounds[d];
      }
    }
    return finalDamageProbs;
  };

  // Calculate the damage from devastating (mortal) wounds and normal wounds separately
  const mortalDamageProbs = calculateTotalDamageDist(devastatingWoundsDist);
  const normalDamageProbs = calculateTotalDamageDist(unsavedNormalWoundsDist);

  // Combine the two damage distributions to get the total
  const totalDamageProbs = convolve(mortalDamageProbs, normalDamageProbs);

  // Convert raw probabilities to the final DiceProbability[] format
  const mortalDamage = mortalDamageProbs.map(p => ({ exact: p, orHigher: 0 }));
  recalculateOrHigher(mortalDamage);

  const normalDamage = normalDamageProbs.map(p => ({ exact: p, orHigher: 0 }));
  recalculateOrHigher(normalDamage);

  const totalDamage = totalDamageProbs.map(p => ({ exact: p, orHigher: 0 }));
  recalculateOrHigher(totalDamage);

  return {
    mortalDamage: trimInsignificantProbabilities(mortalDamage),
    normalDamage: trimInsignificantProbabilities(normalDamage),
    totalDamage: trimInsignificantProbabilities(totalDamage),
  };
}

// Define the new, comprehensive return type for this stage
type SaveAndDamageStageResult = {
  devastatingWounds: DiceProbability[];
  unsavedNormalWounds: DiceProbability[];
  totalUnsaved: DiceProbability[];
  mortalDamage: DiceProbability[];
  normalDamage: DiceProbability[];
  totalDamage: DiceProbability[];
};

/**
 * NEW: Replaces both processSaveStage and processDamageStage.
 * Correctly calculates wound counts and damage by handling the dependency
 * between devastating and normal wounds.
 */
function processSaveAndDamageStage(
  woundProbabilities: DiceProbability[],
  sides: number,
  woundValue: number,
  saveValue: number,
  damageProfile: VariableDiceResult,
  modifiers: DatasheetModifiers
): SaveAndDamageStageResult {
  // If Devastating Wounds isn't active, the logic is simple.
  if (!modifiers.devastatingWounds) {
    const emptyDist = [{ exact: 1.0, orHigher: 1.0 }];
    const unsavedWoundsDist = getCumulativeProbabilities(woundProbabilities, saveValue, woundProbabilities.length - 1, sides);
    const damageResult = processDamageStage(emptyDist, unsavedWoundsDist, damageProfile);

    return {
      devastatingWounds: emptyDist,
      unsavedNormalWounds: unsavedWoundsDist,
      totalUnsaved: unsavedWoundsDist,
      mortalDamage: damageResult.mortalDamage,
      normalDamage: damageResult.normalDamage,
      totalDamage: damageResult.totalDamage,
    };
  }

  // --- Main Devastating Wounds Logic ---
  const singleDamageDist = getSingleDamageRollDistribution(damageProfile);
  const pSuccessWound = getSuccessProbability(woundValue, sides);
  const critWoundTarget = sides;
  const pCritWound = getSuccessProbability(critWoundTarget, sides);
  const pCritGivenSuccess = pSuccessWound > 0 ? pCritWound / pSuccessWound : 0;
  const pFailedSaveOnNormalWound = 1 - getSuccessProbability(saveValue, sides);

  const maxWounds = woundProbabilities.length - 1;
  const maxSingleDamage = (damageProfile.numDice * damageProfile.sides) + damageProfile.bonus;
  const maxTotalDamage = maxWounds * maxSingleDamage;

  // Initialize raw probability arrays for aggregation
  const finalDevWoundProbs = new Array(maxWounds + 1).fill(0);
  const finalNormalUnsavedProbs = new Array(maxWounds + 1).fill(0);
  const finalMortalDamageProbs = new Array(maxTotalDamage + 1).fill(0);
  const finalNormalDamageProbs = new Array(maxTotalDamage + 1).fill(0);
  const finalTotalDamageProbs = new Array(maxTotalDamage + 1).fill(0);

  // For each possible number of incoming wounds...
  for (let numWounds = 0; numWounds <= maxWounds; numWounds++) {
    const probOfNumWounds = woundProbabilities[numWounds]?.exact ?? 0;
    if (probOfNumWounds === 0) continue;

    // ...calculate the distribution of how many are criticals.
    const critDistribution = getBinomialDistribution(numWounds, pCritGivenSuccess);

    // For each possible split into critical and normal wounds...
    for (let numCrits = 0; numCrits <= numWounds; numCrits++) {
      const probOfCrits = critDistribution[numCrits];
      if (probOfCrits === 0) continue;

      const numNormalWounds = numWounds - numCrits;

      // ...calculate the distribution of failed saves for the normal wounds.
      const failedSavesDistribution = getBinomialDistribution(numNormalWounds, pFailedSaveOnNormalWound);

      // Pre-calculate the damage from this specific number of criticals
      const mortalDamageDistForPath = convolvePower(singleDamageDist, numCrits);

      for (let numFailedSaves = 0; numFailedSaves <= numNormalWounds; numFailedSaves++) {
        const probOfFailedSaves = failedSavesDistribution[numFailedSaves];
        if (probOfFailedSaves === 0) continue;

        // This is the probability of this exact final path occurring
        const pathProbability = probOfNumWounds * probOfCrits * probOfFailedSaves;

        // --- Aggregate Wound Counts ---
        finalDevWoundProbs[numCrits] += pathProbability;
        finalNormalUnsavedProbs[numFailedSaves] += pathProbability;

        // --- Aggregate Damage Distributions ---
        const normalDamageDistForPath = convolvePower(singleDamageDist, numFailedSaves);

        // Add the damage from devastating wounds, weighted by this path's probability
        for (let d = 0; d < mortalDamageDistForPath.length; d++) {
          finalMortalDamageProbs[d] += pathProbability * mortalDamageDistForPath[d];
        }

        // Add the damage from normal unsaved wounds, weighted by this path's probability
        for (let d = 0; d < normalDamageDistForPath.length; d++) {
          finalNormalDamageProbs[d] += pathProbability * normalDamageDistForPath[d];
        }

        // Convolve and add the total damage for this specific path
        const totalDamageDistForPath = convolve(mortalDamageDistForPath, normalDamageDistForPath);
        for (let d = 0; d < totalDamageDistForPath.length; d++) {
          finalTotalDamageProbs[d] += pathProbability * totalDamageDistForPath[d];
        }
      }
    }
  }

  // Combine wound counts for the total unsaved wounds distribution
  const totalUnsavedProbs = convolve(finalDevWoundProbs, finalNormalUnsavedProbs);

  // Convert all raw probability arrays to the final DiceProbability[] format
  const formatAndTrim = (dist: number[]) => {
    const result = dist.map(p => ({ exact: p, orHigher: 0 }));
    recalculateOrHigher(result);
    return trimInsignificantProbabilities(result);
  };

  return {
    devastatingWounds: formatAndTrim(finalDevWoundProbs),
    unsavedNormalWounds: formatAndTrim(finalNormalUnsavedProbs),
    totalUnsaved: formatAndTrim(totalUnsavedProbs),
    mortalDamage: formatAndTrim(finalMortalDamageProbs),
    normalDamage: formatAndTrim(finalNormalDamageProbs),
    totalDamage: formatAndTrim(finalTotalDamageProbs),
  };
}

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
): CalculationResult {
  const totalAttacks = attacks.bonus * attacker.models;

  // --- Stage 1: Hits ---
  const hitProbabilities = processHitStage(totalAttacks, sides, hitValue, modifiers);

  // --- Stage 2: Wounds ---
  // For now, this still returns one array of total successful wounds.
  // If you later split Lethal Hits, this is where that logic would go.
  const woundProbabilities = processWoundStage(hitProbabilities, sides, hitValue, woundValue, modifiers);

  // --- Stage 3: Saves (now returns a detailed object) ---
  // const saveStageResult = processSaveStage(totalAttacks, woundProbabilities, sides, woundValue, saveValue, modifiers);
  const finalResult = processSaveAndDamageStage(
    woundProbabilities,
    sides,
    woundValue,
    saveValue,
    parseDice(weapon.damage),
    modifiers
  );

  // --- Stage 4: Damage Calculation ---
  // const damageStageResult = processDamageStage(
  //   saveStageResult.devastatingWounds,
  //   saveStageResult.unsavedNormalWounds,
  //   parseDice(weapon.damage)
  // );

  return {
    attacks: getDiceProbabilities(totalAttacks, sides, 1),
    hits: trimInsignificantProbabilities(hitProbabilities),
    wounds: trimInsignificantProbabilities(woundProbabilities),
    // Unpack all the results from the new function
    devastatingWounds: finalResult.devastatingWounds,
    unsaved: finalResult.unsavedNormalWounds,
    mortalWounds: finalResult.mortalDamage,
    damage: finalResult.normalDamage,
    totalDamage: finalResult.totalDamage,
  };
}

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

  // If attacks.numDice is 0, it means a flat number of attacks equal to attacks.bonus
  if (attacks.numDice === 0) {
    return calculateAttackSequence(
      attacker,
      { numDice: attacks.bonus, sides: 0, bonus: 0 },
      defender,
      weapon,
      sides,
      hitValue,
      woundValue,
      saveValue,
      modifiers
    );
  }
  const { numDice: attackDiceNum, sides: attackDiceSides, bonus: attackBonus } = attacks;
  // Parse the damage profile once here to avoid repeated parsing later
  const damageProfile = parseDice(weapon.damage);

  // Get the distribution for the variable number of attacks.
  // This gives us the probability of rolling each possible total number of attacks.
  const attackDistribution = getDiceSumDistribution(attackDiceNum, attackDiceSides);
  const maxAttacks = (attackDistribution.length - 1) + attackBonus;
  const maxSingleDamage = (damageProfile.numDice * damageProfile.sides) + damageProfile.bonus;
  const maxTotalDamage = maxAttacks * maxSingleDamage;

  // Prepare the final result structure with zeroed probabilities.
  const finalResult: CalculationResult = {
    attacks: attackDistribution,
    hits: Array(maxAttacks + 1).fill(null).map(() => ({ exact: 0, orHigher: 0 })),
    wounds: Array(maxAttacks + 1).fill(null).map(() => ({ exact: 0, orHigher: 0 })),
    devastatingWounds: Array(maxAttacks + 1).fill(null).map(() => ({ exact: 0, orHigher: 0 })),
    unsaved: Array(maxAttacks + 1).fill(null).map(() => ({ exact: 0, orHigher: 0 })),
    mortalWounds: Array(maxTotalDamage + 1).fill(null).map(() => ({ exact: 0, orHigher: 0 })),
    damage: Array(maxTotalDamage + 1).fill(null).map(() => ({ exact: 0, orHigher: 0 })),
    totalDamage: Array(maxTotalDamage + 1).fill(null).map(() => ({ exact: 0, orHigher: 0 })),
  };

  // Iterate over each possible number of attacks
  for (let rollSum = 0; rollSum < attackDistribution.length; rollSum++) {
    const probOfThisManyAttacks = attackDistribution[rollSum].exact;
    if (probOfThisManyAttacks === 0) continue;

    const numAttacks = rollSum + attackBonus;
    const sequenceResult = calculateAttackSequence(
      attacker,
      { numDice: numAttacks, sides: 0, bonus: 0 }, // attacks already resolved to a fixed number
      defender,
      weapon,
      sides,
      hitValue,
      woundValue,
      saveValue,
      modifiers
    );

    // The maximum number of successes in any category is limited by numAttacks for this specific sequence
    for (let i = 0; i <= numAttacks; i++) {
      // Use optional chaining (`?.`) in case trimming made an array shorter
      finalResult.hits[i].exact += (sequenceResult.hits[i]?.exact ?? 0) * probOfThisManyAttacks;
      finalResult.wounds[i].exact += (sequenceResult.wounds[i]?.exact ?? 0) * probOfThisManyAttacks;
      finalResult.devastatingWounds[i].exact += (sequenceResult.devastatingWounds[i]?.exact ?? 0) * probOfThisManyAttacks;
      finalResult.unsaved[i].exact += (sequenceResult.unsaved[i]?.exact ?? 0) * probOfThisManyAttacks;
    }

    // Aggregate damage distributions (up to their calculated max length)
    for (let i = 0; i < sequenceResult.mortalWounds.length; i++) {
      finalResult.mortalWounds[i].exact += sequenceResult.mortalWounds[i].exact * probOfThisManyAttacks;
    }
    for (let i = 0; i < sequenceResult.damage.length; i++) {
      finalResult.damage[i].exact += sequenceResult.damage[i].exact * probOfThisManyAttacks;
    }
    for (let i = 0; i < sequenceResult.totalDamage.length; i++) {
      finalResult.totalDamage[i].exact += sequenceResult.totalDamage[i].exact * probOfThisManyAttacks;
    }
  }

  recalculateOrHigher(finalResult.hits);
  recalculateOrHigher(finalResult.wounds);
  recalculateOrHigher(finalResult.devastatingWounds);
  recalculateOrHigher(finalResult.unsaved);

  // No trimming is needed here, as the trimming is handled inside calculateAttackSequence
  // before the results are returned and aggregated.

  return finalResult;
}