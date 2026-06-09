import { describe, expect, test } from 'vitest';

import {
  buildDerivedSleepNeedBaseline,
  buildEstimatedSleepDebt,
  buildSleepDayTotals,
} from '../src/sleep-debt';
import { SleepPeriod } from '../src/types';

function sleepPeriod(input: Partial<SleepPeriod> & Pick<SleepPeriod, 'day'>): SleepPeriod {
  return {
    id: input.id ?? `${input.day}-${input.total_sleep_duration ?? 0}`,
    day: input.day,
    bedtime_start: '',
    bedtime_end: '',
    duration: input.duration ?? input.total_sleep_duration ?? 0,
    total_sleep_duration: input.total_sleep_duration ?? 0,
    awake_time: 0,
    light_sleep_duration: 0,
    deep_sleep_duration: 0,
    rem_sleep_duration: 0,
    efficiency: 0,
    average_heart_rate: null,
    lowest_heart_rate: null,
    average_hrv: null,
    type: input.type ?? 'long_sleep',
  };
}

describe('sleep debt', () => {
  test('sums all non-deleted sleep sessions by day', () => {
    const totals = buildSleepDayTotals(
      [
        sleepPeriod({ day: '2026-03-01', total_sleep_duration: 25_000 }),
        sleepPeriod({ day: '2026-03-01', total_sleep_duration: 1_800, type: 'nap' }),
        sleepPeriod({ day: '2026-03-02', total_sleep_duration: 27_000 }),
        sleepPeriod({ day: '2026-03-02', total_sleep_duration: 3_600, type: 'deleted' }),
        sleepPeriod({ day: '2026-03-03', total_sleep_duration: 26_000 }),
      ],
      '2026-03-01',
      '2026-03-02'
    );

    expect(totals).toEqual([
      { day: '2026-03-01', totalSleepDuration: 26_800 },
      { day: '2026-03-02', totalSleepDuration: 27_000 },
    ]);
  });

  test('builds a trimmed typical sleep-need baseline from daily sleep totals', () => {
    const sleepNeed = buildDerivedSleepNeedBaseline([
      { day: '2026-03-01', totalSleepDuration: 14_400 },
      { day: '2026-03-02', totalSleepDuration: 24_600 },
      { day: '2026-03-03', totalSleepDuration: 24_600 },
      { day: '2026-03-04', totalSleepDuration: 24_600 },
      { day: '2026-03-05', totalSleepDuration: 24_600 },
      { day: '2026-03-06', totalSleepDuration: 24_600 },
      { day: '2026-03-07', totalSleepDuration: 24_600 },
      { day: '2026-03-08', totalSleepDuration: 24_600 },
      { day: '2026-03-09', totalSleepDuration: 24_600 },
      { day: '2026-03-10', totalSleepDuration: 24_600 },
      { day: '2026-03-11', totalSleepDuration: 24_600 },
      { day: '2026-03-12', totalSleepDuration: 24_600 },
      { day: '2026-03-13', totalSleepDuration: 24_600 },
      { day: '2026-03-14', totalSleepDuration: 36_000 },
    ]);

    expect(sleepNeed).toMatchObject({
      status: 'ready',
      seconds: 24_600,
      displayValue: '6h 50m',
      method: 'sleep_total_trimmed_mean_90d',
      source: 'sleep_total_all_sessions',
      historyDays: 90,
      sampleSize: 14,
      trimmedSampleSize: 12,
      minSampleSize: 14,
      lowerTrimPercentile: 0.1,
      upperTrimPercentile: 0.9,
    });
  });

  test('estimates two-week sleep debt as a decayed signed balance', () => {
    const sleepNeed = buildDerivedSleepNeedBaseline([
      { day: '2026-03-01', totalSleepDuration: 24_600 },
      { day: '2026-03-02', totalSleepDuration: 24_600 },
      { day: '2026-03-03', totalSleepDuration: 24_600 },
      { day: '2026-03-04', totalSleepDuration: 24_600 },
      { day: '2026-03-05', totalSleepDuration: 24_600 },
      { day: '2026-03-06', totalSleepDuration: 24_600 },
      { day: '2026-03-07', totalSleepDuration: 24_600 },
      { day: '2026-03-08', totalSleepDuration: 24_600 },
      { day: '2026-03-09', totalSleepDuration: 24_600 },
      { day: '2026-03-10', totalSleepDuration: 24_600 },
      { day: '2026-03-11', totalSleepDuration: 24_600 },
      { day: '2026-03-12', totalSleepDuration: 24_600 },
      { day: '2026-03-13', totalSleepDuration: 24_600 },
      { day: '2026-03-14', totalSleepDuration: 24_600 },
    ]);

    const debt = buildEstimatedSleepDebt({
      sleepNeed,
      startDay: '2026-05-27',
      endDay: '2026-06-09',
      dayTotals: [
        { day: '2026-05-27', totalSleepDuration: 12_720 },
        { day: '2026-05-28', totalSleepDuration: 24_600 },
        { day: '2026-05-29', totalSleepDuration: 24_600 },
        { day: '2026-05-30', totalSleepDuration: 24_600 },
        { day: '2026-05-31', totalSleepDuration: 24_600 },
        { day: '2026-06-01', totalSleepDuration: 24_600 },
        { day: '2026-06-02', totalSleepDuration: 24_600 },
        { day: '2026-06-03', totalSleepDuration: 24_600 },
        { day: '2026-06-04', totalSleepDuration: 24_360 },
        { day: '2026-06-05', totalSleepDuration: 23_520 },
        { day: '2026-06-06', totalSleepDuration: 21_180 },
        { day: '2026-06-07', totalSleepDuration: 14_700 },
        { day: '2026-06-08', totalSleepDuration: 32_760 },
        { day: '2026-06-09', totalSleepDuration: 30_120 },
      ],
    });

    expect(debt).toMatchObject({
      status: 'low',
      valueSeconds: 4_200,
      displayValue: '1h 10m',
      sleepNeedSeconds: 24_600,
      sleepNeedDisplayValue: '6h 50m',
      source: 'derived_from_sleep_history',
      method: 'decayed_signed_balance',
      decayFactor: 0.935,
      sampleSize: 14,
    });
  });

  test('returns not enough data before the current window has five sleep days', () => {
    const debt = buildEstimatedSleepDebt({
      sleepNeed: {
        status: 'ready',
        seconds: 28_800,
        displayValue: '8h 0m',
        method: 'sleep_total_trimmed_mean_90d',
        source: 'sleep_total_all_sessions',
        historyDays: 90,
        sampleSize: 14,
        trimmedSampleSize: 14,
        minSampleSize: 14,
        lowerTrimPercentile: 0.1,
        upperTrimPercentile: 0.9,
        sourceStartDay: '2025-12-15',
        sourceEndDay: '2026-03-14',
      },
      startDay: '2026-03-01',
      endDay: '2026-03-14',
      dayTotals: [{ day: '2026-03-14', totalSleepDuration: 28_800 }],
    });

    expect(debt).toMatchObject({
      status: 'not_enough_data',
      valueSeconds: null,
      displayValue: null,
      sampleSize: 1,
    });
  });
});
