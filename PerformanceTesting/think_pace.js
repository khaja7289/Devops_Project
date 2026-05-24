// think_pace.js
// Calculate think time and pace time using Little's Law for K6 scripts

/**
 * Calculate think time and pace time for a given throughput per hour (TPH) and number of users (VUS).
 * @param {number} tph - Target throughput per hour (requests per hour)
 * @param {number} vus - Number of virtual users
 * @param {number} [avgServiceTime=2.5] - Average service time per iteration (seconds, default 2.5)
 * @returns {{thinkTime: number, paceTime: number, targetIterationSeconds: number}}
 */
export function calculateThinkAndPaceTime(tph, vus, avgServiceTime = 2.5) {
  // Little's Law: L = λ * W
  // λ = throughput per second = tph / 3600
  // W = average time in system per iteration
  // L = average number of users (vus)
  // Target iteration time per user
  const targetIterationSeconds = (3600 * vus) / tph;
  // Think time is the time a user waits between actions (simulate user delay)
  // Pace time is the time to wait to achieve the target throughput
  // Here, we split the difference between avgServiceTime and targetIterationSeconds
  const thinkTime = Math.max(0, targetIterationSeconds - avgServiceTime);
  const paceTime = 0; // K6 will sleep(thinkTime) + sleep(paceTime) to match target
  return { thinkTime, paceTime, targetIterationSeconds };
}
