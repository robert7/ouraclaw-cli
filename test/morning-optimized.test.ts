import { describe, expect, test } from 'vitest';

import { evaluateMorningOptimized } from '../src/morning-optimized';
import { defaultThresholds } from '../src/thresholds';

describe('morning-optimized', () => {
  test('returns not ready when required fields are missing', () => {
    const result = evaluateMorningOptimized({
      today: {
        day: '2026-03-13',
        sleepScore: null,
        readinessScore: 80,
        temperatureDeviation: 0.1,
      },
      thresholds: defaultThresholds(),
    });

    expect(result.dataReady).toBe(false);
    expect(result.shouldSend).toBe(false);
    expect(result.reasons).toContain('missing_sleep_score');
  });

  test('sends when fixed thresholds fail', () => {
    const result = evaluateMorningOptimized({
      today: {
        day: '2026-03-13',
        sleepScore: 70,
        readinessScore: 72,
        temperatureDeviation: 0.3,
        averageHrv: 42,
        lowestHeartRate: 48,
        totalSleepDuration: 28000,
      },
      thresholds: defaultThresholds(),
      baselineStatus: 'ready',
    });

    expect(result.dataReady).toBe(true);
    expect(result.shouldSend).toBe(true);
    expect(result.reasons.slice(0, 2)).toEqual([
      'sleep_below_threshold',
      'readiness_below_threshold',
    ]);
    expect(result.message).toContain('outside your ordinary range');
  });

  test('sends when two baseline metrics are out of range', () => {
    const result = evaluateMorningOptimized({
      today: {
        day: '2026-03-13',
        sleepScore: 80,
        readinessScore: 82,
        temperatureDeviation: 0,
        averageHrv: 20,
        lowestHeartRate: 60,
        totalSleepDuration: 25000,
      },
      thresholds: defaultThresholds(),
      baselineStatus: 'ready',
      baseline: {
        mode: 'calendar-weeks',
        updatedAt: '2026-03-10T00:00:00.000Z',
        sourceStartDay: '2026-02-16',
        sourceEndDay: '2026-03-08',
        weeks: ['2026-W08', '2026-W09', '2026-W10'],
        metrics: {
          averageHrv: { median: 40, low: 35, high: 45, sampleSize: 10 },
          lowestHeartRate: { median: 49, low: 47, high: 51, sampleSize: 10 },
          totalSleepDuration: { median: 28000, low: 27000, high: 29000, sampleSize: 10 },
        },
      },
    });

    expect(result.shouldSend).toBe(true);
    expect(result.reasons).toEqual([
      'baseline_hrv_out_of_range',
      'baseline_lowest_heart_rate_out_of_range',
      'baseline_total_sleep_duration_out_of_range',
    ]);
  });

  test('keeps fixed-threshold reasons first when baseline also fires', () => {
    const result = evaluateMorningOptimized({
      today: {
        day: '2026-03-13',
        sleepScore: 70,
        readinessScore: 80,
        temperatureDeviation: 0.2,
        averageHrv: 20,
        lowestHeartRate: 60,
        totalSleepDuration: 28000,
      },
      thresholds: defaultThresholds(),
      baselineStatus: 'ready',
      baseline: {
        mode: 'calendar-weeks',
        updatedAt: '2026-03-10T00:00:00.000Z',
        sourceStartDay: '2026-02-16',
        sourceEndDay: '2026-03-08',
        weeks: ['2026-W08', '2026-W09', '2026-W10'],
        metrics: {
          averageHrv: { median: 40, low: 35, high: 45, sampleSize: 10 },
          lowestHeartRate: { median: 49, low: 47, high: 51, sampleSize: 10 },
        },
      },
    });

    expect(result.reasons[0]).toBe('sleep_below_threshold');
    expect(result.reasons[1]).toBe('temperature_outside_threshold');
    expect(result.reasons[2]).toBe('baseline_hrv_out_of_range');
  });
});
