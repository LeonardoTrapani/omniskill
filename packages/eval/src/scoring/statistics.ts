export interface StatisticalResult {
  mean: number;
  stdDev: number;
  ci95: [number, number];
  sampleSize: number;
}

export interface ABTestResult {
  control: StatisticalResult;
  treatment: StatisticalResult;
  delta: StatisticalResult;
  effectSize: number;
  pValue: number;
  significant: boolean;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const sumSq = values.reduce((sum, v) => sum + (v - avg) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

function ci95(avg: number, sd: number, n: number): [number, number] {
  if (n < 2) return [avg, avg];
  const se = sd / Math.sqrt(n);
  const t = 1.96; // approximate for large n
  return [avg - t * se, avg + t * se];
}

function summarize(values: number[]): StatisticalResult {
  const avg = mean(values);
  const sd = stdDev(values, avg);
  return {
    mean: avg,
    stdDev: sd,
    ci95: ci95(avg, sd, values.length),
    sampleSize: values.length,
  };
}

/**
 * Welch's t-test for unequal variances.
 */
function welchTTest(
  m1: number,
  s1: number,
  n1: number,
  m2: number,
  s2: number,
  n2: number,
): { tStat: number; df: number; pValue: number } {
  if (n1 < 2 || n2 < 2) return { tStat: 0, df: 0, pValue: 1 };

  const v1 = s1 ** 2 / n1;
  const v2 = s2 ** 2 / n2;
  const se = Math.sqrt(v1 + v2);
  if (se === 0) return { tStat: 0, df: n1 + n2 - 2, pValue: 1 };

  const tStat = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const df = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1));

  // Approximate p-value using normal distribution for large df
  const absT = Math.abs(tStat);
  const pValue = 2 * (1 - normalCDF(absT));

  return { tStat, df, pValue };
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp((-absX * absX) / 2);
  return 0.5 * (1 + sign * y);
}

/**
 * Cohen's d effect size.
 */
function cohensD(m1: number, s1: number, m2: number, s2: number): number {
  const pooledSD = Math.sqrt((s1 ** 2 + s2 ** 2) / 2);
  if (pooledSD === 0) return 0;
  return (m2 - m1) / pooledSD;
}

export function computeABTest(controlValues: number[], treatmentValues: number[]): ABTestResult {
  const controlStats = summarize(controlValues);
  const treatmentStats = summarize(treatmentValues);

  const deltas = treatmentValues.map((t, i) => t - (controlValues[i] ?? 0));
  const deltaStats = summarize(deltas);

  const { pValue } = welchTTest(
    controlStats.mean,
    controlStats.stdDev,
    controlStats.sampleSize,
    treatmentStats.mean,
    treatmentStats.stdDev,
    treatmentStats.sampleSize,
  );

  const effectSize = cohensD(
    controlStats.mean,
    controlStats.stdDev,
    treatmentStats.mean,
    treatmentStats.stdDev,
  );

  return {
    control: controlStats,
    treatment: treatmentStats,
    delta: deltaStats,
    effectSize,
    pValue,
    significant: pValue < 0.05,
  };
}
