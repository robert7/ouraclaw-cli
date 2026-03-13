import { BASELINE_METRICS } from './config';
import { evaluateFixedThresholds } from './thresholds';
import { BaselineMetricKey, MorningOptimizedInput, MorningOptimizedResult } from './types';
import { formatDuration } from './date-utils';

const baselineReasonMap: Record<BaselineMetricKey, string> = {
  averageHrv: 'baseline_hrv_out_of_range',
  lowestHeartRate: 'baseline_lowest_heart_rate_out_of_range',
  totalSleepDuration: 'baseline_total_sleep_duration_out_of_range',
};

function buildAlertMessage(result: MorningOptimizedResult): string {
  return [
    `Good morning. Today's Oura data is outside your ordinary range for ${result.today.day}.`,
    `Sleep ${result.today.sleepScore}, readiness ${result.today.readinessScore}, temp ${
      result.today.temperatureDeviation == null
        ? 'n/a'
        : result.today.temperatureDeviation.toFixed(1)
    }C.`,
    `Detailed sleep: HRV ${result.today.averageHrv ?? 'n/a'} ms, lowest HR ${
      result.today.lowestHeartRate ?? 'n/a'
    } bpm, total sleep ${formatDuration(result.today.totalSleepDuration ?? null)}.`,
    `Reasons: ${result.reasons.join(', ')}.`,
  ].join(' ');
}

export function evaluateMorningOptimized(input: MorningOptimizedInput): MorningOptimizedResult {
  const missingReasons: string[] = [];
  if (input.today.sleepScore == null) {
    missingReasons.push('missing_sleep_score');
  }
  if (input.today.readinessScore == null) {
    missingReasons.push('missing_readiness_score');
  }
  if (input.today.temperatureDeviation == null) {
    missingReasons.push('missing_temperature_deviation');
  }

  if (missingReasons.length > 0) {
    return {
      dataReady: false,
      ordinary: false,
      shouldSend: false,
      baselineStatus: input.baselineStatus,
      today: input.today,
      baseline: input.baseline,
      reasons: missingReasons,
    };
  }

  const sleepScore = input.today.sleepScore;
  const readinessScore = input.today.readinessScore;
  const temperatureDeviation = input.today.temperatureDeviation;

  const fixedThreshold = evaluateFixedThresholds({
    sleepScore: sleepScore as number,
    readinessScore: readinessScore as number,
    temperatureDeviation: temperatureDeviation as number,
    thresholds: input.thresholds,
  });

  const baselineReasons: string[] = [];
  if (input.baseline) {
    for (const metric of BASELINE_METRICS) {
      const snapshot = input.baseline.metrics[metric];
      const value = input.today[metric];
      if (!snapshot || value == null) {
        continue;
      }

      if (value < snapshot.low || value > snapshot.high) {
        baselineReasons.push(baselineReasonMap[metric]);
      }
    }
  }

  const baselineTriggered = baselineReasons.length >= 2;
  const shouldSend = fixedThreshold.reasons.length > 0 || baselineTriggered;
  const reasons = [...fixedThreshold.reasons, ...(baselineTriggered ? baselineReasons : [])];

  const result: MorningOptimizedResult = {
    dataReady: true,
    ordinary: !shouldSend,
    shouldSend,
    baselineStatus: input.baselineStatus,
    today: input.today,
    baseline: input.baseline,
    reasons,
  };

  if (shouldSend) {
    result.message = buildAlertMessage(result);
  }

  return result;
}
