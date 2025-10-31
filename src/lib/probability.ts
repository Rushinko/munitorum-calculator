import { lgamma } from 'mathjs';
export type Probabilities = { exact: number[]; orHigher: number[] };
export type DiceProbability = { exact: number; orHigher: number };


/**
 * Calculates the factorial of a non-negative integer.
 * @param n - The number to calculate the factorial of.
 * @returns The factorial of n.
 */
function factorial(n: number): number {
  if (n < 0) {
    throw new Error("Factorial is not defined for negative numbers.");
  }
  if (n === 0) {
    return 1;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}


/**
 * Calculates the binomial probability mass function (PMF).
 * Returns an array where the index 'k' is the probability of getting exactly 'k' successes.
 * @param n - The number of trials.
 * @param p - The probability of success on a single trial.
 */
export function getBinomialDistribution(n: number, p: number): number[] {
  if (p < 0 || p > 1 || n < 0) return [];

  const distribution = new Array(n + 1).fill(0);
  // Pre-calculate ln(p) and ln(1-p) for numerical stability.
  const logP = Math.log(p);
  const log1mP = Math.log(1 - p);

  // Use log-gamma for calculating log(n choose k) to avoid large numbers.
  // A simple factorial-based approach is also fine for smaller 'n'.
  // This is a robust implementation.
  const logNCk = (k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

  for (let k = 0; k <= n; k++) {
    if (p === 0) {
      distribution[k] = k === 0 ? 1 : 0;
      continue;
    }
    if (p === 1) {
      distribution[k] = k === n ? 1 : 0;
      continue;
    }
    // Calculate using logs to prevent floating point underflow/overflow
    const logProb = logNCk(k) + k * logP + (n - k) * log1mP;
    distribution[k] = Math.exp(logProb);
  }
  return distribution;
}


/**
 * Calculates the binomial coefficient C(n, k), or "n choose k".
 * This is the number of ways to choose k items from a set of n items.
 * @param n - The total number of items.
 * @param k - The number of items to choose.
 * @returns The binomial coefficient C(n, k), also known as the number of combinations.
 */
function getBinomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) {
    return 0;
  }
  // C(n, k) = n! / (k! * (n-k)!)
  return factorial(n) / (factorial(k) * factorial(n - k));
}

const calculateEffectiveProbability = (initialProbability: number, sides: number, rerollType: 'none' | 'ones' | 'fails' | 'non-crits' = 'none'): number => {
  switch (rerollType) {
    case 'ones':
      // Added probability = P(rolling a 1) * P(success on reroll)
      const probOfOne = 1 / sides;
      return initialProbability + (probOfOne * initialProbability);
    case 'fails':
      // Added probability = P(initial fail) * P(success on reroll)
      const probOfFailure = 1 - initialProbability;
      return initialProbability + (probOfFailure * initialProbability);
    case 'none':
      return initialProbability;
    case 'non-crits':
      const probOfNonCrits = (sides - 1) / sides;
      return initialProbability + (probOfNonCrits * initialProbability);
    default:
      return initialProbability;
  }
}

/**
 * Performs convolution raised to a power using exponentiation by squaring.
 * This is much more efficient than repeated convolution in a loop.
 */
export function convolvePower(dist: number[], power: number): number[] {
  if (power === 0) return [1.0];
  if (power === 1) return [...dist]; // Return a copy

  let result = [1.0];
  let current = [...dist];

  while (power > 0) {
    if (power % 2 === 1) {
      result = convolve(result, current);
    }
    current = convolve(current, current);
    power = Math.floor(power / 2);
  }
  return result;
}

/**
 * Combines two probability distributions to find the distribution of their sum.
 * (This is a discrete convolution, equivalent to polynomial multiplication).
 */
export function convolve(dist1: number[], dist2: number[]): number[] {
  const newLength = dist1.length + dist2.length - 1;
  const result = new Array(newLength).fill(0);

  for (let i = 0; i < dist1.length; i++) {
    for (let j = 0; j < dist2.length; j++) {
      // If either probability is zero, the product is zero, so we can skip.
      if (dist1[i] > 0 && dist2[j] > 0) {
        result[i + j] += dist1[i] * dist2[j];
      }
    }
  }
  return result;
}

/**
 * Calculates the final probability distribution for 'numDice' by repeatedly
 * convolving the distribution of a single die.
 */
export function getConvolvedDistribution(singleDieDist: number[], numDice: number): number[] {
  if (numDice === 0) return [1.0]; // The probability of getting 0 successes with 0 dice is 1.
  if (numDice === 1) return singleDieDist;

  let result = singleDieDist;
  for (let i = 1; i < numDice; i++) {
    result = convolve(result, singleDieDist);
  }
  return result;
}

/**
 * Calculates the probabilities of achieving a certain number of successful dice rolls.
 *
 * @param numDice - The total number of dice to roll.
 * @param sides - The number of sides on each die (e.g., 6 for a d6).
 * @param target - The value a single die must roll to be a success.
 * @returns An object containing two arrays:
 * - `exact`: The probability of getting *exactly* k successes.
 * - `orHigher`: The probability of getting *k or more* successes.
 * The index of each array corresponds to the number of successes (k).
 */
export function getDiceProbabilities(numDice: number, sides: number, target: number, rerollType: 'none' | 'ones' | 'fails' | 'non-crits' = 'none'): DiceProbability[] {
  if (numDice <= 0 || sides <= 0) {
    return [{ exact: 1.0, orHigher: 1.0 }];
  }

  // Calculate the probability of a single success (p) and failure (q)
  const successfulOutcomes = sides - target + 1 > 0 ? sides - target + 1 : 0;
  const initialP = successfulOutcomes / sides;
  const p = calculateEffectiveProbability(initialP, sides, rerollType);
  const q = 1 - p;

  const exactProbs: number[] = [];

  // Calculate the probability for exactly k successes, from k=0 to k=numDice
  for (let k = 0; k <= numDice; k++) {
    const probability = getBinomialCoefficient(numDice, k) * Math.pow(p, k) * Math.pow(q, numDice - k);
    exactProbs.push(probability);
  }

  // Calculate the cumulative probability for k or more successes
  const results: DiceProbability[] = new Array(numDice + 1);
  let cumulativeProbability = 0;
  for (let k = numDice; k >= 0; k--) {
    cumulativeProbability += exactProbs[k];
    // Prepending to the array, or you can push and reverse later
    results[k] = { exact: exactProbs[k], orHigher: cumulativeProbability };
  }


  // Correct for potential floating-point inaccuracies
  if (results.length > 0) {
    results[0].orHigher = 1.0;
  }

  return results;
}

export function getCumulativeProbabilities(probabilities: DiceProbability[], target: number, trials: number, sides: number, reroll?: 'none' | 'ones' | 'fails' | 'non-crits'): DiceProbability[] {
  // 1. This part remains the same: calculate the final 'exact' probabilities.
  const successProbabilityExact = new Array(trials + 1).fill(0);

  for (let h = 0; h <= trials; h++) {
    // Access the 'exact' property from the object at index 'h'.
    const probsOfPreviousSuccess = probabilities[h].exact;
    if (probsOfPreviousSuccess === 0) continue;

    const successProbsForHAttempts = getDiceProbabilities(h, sides, target, reroll);

    for (let w = 0; w <= h; w++) {
      const probsOfSuccessForHSuccess = successProbsForHAttempts[w].exact;
      successProbabilityExact[w] += probsOfPreviousSuccess * probsOfSuccessForHSuccess;
    }
  }

  // This final part remains the same as the last version
  const results: DiceProbability[] = new Array(trials + 1);
  let cumulative = 0;

  for (let k = trials; k >= 0; k--) {
    cumulative += successProbabilityExact[k];
    results[k] = {
      exact: successProbabilityExact[k],
      orHigher: cumulative,
    };
  }

  if (results.length > 0) {
    results[0].orHigher = 1.0;
  }

  return results;
}

/**
 * Trims a probability distribution, removing entries where the 'orHigher'
 * probability is below a given threshold.
 * @param distribution The DiceProbability array to trim.
 * @param threshold The minimum 'orHigher' value to keep (e.g., 0.0001 for 0.01%).
 * @returns A new, trimmed DiceProbability array.
 */
export function trimInsignificantProbabilities(
  distribution: DiceProbability[],
  threshold: number = 0.0001
): DiceProbability[] {
  // Find the index of the first element with an 'orHigher' probability
  // below the threshold.
  if (distribution.length === 0 ) return [];
  const trimIndex = distribution.findIndex(p => p.orHigher < threshold);

  // If no such element is found (all probabilities are significant),
  // or if the first element is already insignificant (meaning the whole array is),
  // return the appropriate result.
  if (trimIndex === -1) {
    return distribution; // No trimming needed
  }
  if (trimIndex === 0) {
    return []; // All entries are insignificant
  }

  // Slice the array to include only the elements before the trim index.
  return distribution.slice(0, trimIndex);
}

/**
 * Converts a target value (e.g., 4+ on a d6) to the 'target' parameter.
 * @param value The number to beat (e.g., 4 for a 4+).
 * @param sides The number of sides on the die.
 * @returns The target value for the probability functions.
 */
export function valueToTarget(value: number, sides: number): number {
  const successfulOutcomes = sides + 1 - (value - 1);
  return successfulOutcomes;
}

export function randomNumberWraper(max: number, min: number = 0) {

}

/**
 * Calculates the probability distribution for the sum of multiple dice.
 * @param numDice The number of dice to roll.
 * @param sides The number of sides on each die.
 * @returns A DiceProbability[] array where the index represents the sum.
 */
export function getDiceSumDistribution(numDice: number, sides: number): DiceProbability[] {
  const maxSum = numDice * sides;
  // Start with an array representing a sum of 0 with 100% probability.
  let exactProbs: number[] = [1.0];

  for (let i = 0; i < numDice; i++) {
    const newProbs = new Array(exactProbs.length + sides).fill(0);
    for (let sum = 0; sum < exactProbs.length; sum++) {
      const prob = exactProbs[sum];
      if (prob > 0) {
        for (let roll = 1; roll <= sides; roll++) {
          newProbs[sum + roll] += prob * (1 / sides);
        }
      }
    }
    exactProbs = newProbs;
  }

  // Ensure the array has the correct length up to maxSum + 1
  if (exactProbs.length < maxSum + 1) {
    exactProbs.length = maxSum + 1;
  }
  exactProbs = exactProbs.map(p => p || 0);


  // Now, convert the exactProbs array into the DiceProbability[] format
  const results: DiceProbability[] = new Array(maxSum + 1);
  let cumulativeProbability = 0;
  for (let k = maxSum; k >= 0; k--) {
    const exact = exactProbs[k];
    cumulativeProbability += exact;
    results[k] = { exact, orHigher: cumulativeProbability };
  }

  return results;
}