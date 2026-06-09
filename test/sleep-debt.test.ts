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

  test('builds a p75 sleep-need baseline from daily sleep totals', () => {
    const sleepNeed = buildDerivedSleepNeedBaseline([
      { day: '2026-03-01', totalSleepDuration: 25_200 },
      { day: '2026-03-02', totalSleepDuration: 26_100 },
      { day: '2026-03-03', totalSleepDuration: 27_000 },
      { day: '2026-03-04', totalSleepDuration: 28_800 },
      { day: '2026-03-05', totalSleepDuration: 30_600 },
    ]);

    expect(sleepNeed).toEqual({
      status: 'ready',
      seconds: 28_800,
      displayValue: '8h 0m',
      method: 'sleep_total_p75',
      source: 'sleep_total_all_sessions',
      sampleSize: 5,
      minSampleSize: 5,
    });
  });

  test('estimates two-week sleep debt from the derived sleep need', () => {
    const sleepNeed = buildDerivedSleepNeedBaseline([
      { day: '2026-03-01', totalSleepDuration: 28_800 },
      { day: '2026-03-02', totalSleepDuration: 28_800 },
      { day: '2026-03-03', totalSleepDuration: 28_800 },
      { day: '2026-03-04', totalSleepDuration: 28_800 },
      { day: '2026-03-05', totalSleepDuration: 28_800 },
    ]);

    const debt = buildEstimatedSleepDebt({
      sleepNeed,
      startDay: '2026-03-01',
      endDay: '2026-03-14',
      dayTotals: [
        { day: '2026-03-10', totalSleepDuration: 27_000 },
        { day: '2026-03-11', totalSleepDuration: 21_600 },
        { day: '2026-03-12', totalSleepDuration: 28_800 },
        { day: '2026-03-13', totalSleepDuration: 30_000 },
        { day: '2026-03-14', totalSleepDuration: 28_200 },
      ],
    });

    expect(debt).toMatchObject({
      status: 'moderate',
      valueSeconds: 9_600,
      displayValue: '2h 40m',
      sleepNeedSeconds: 28_800,
      sleepNeedDisplayValue: '8h 0m',
      source: 'derived_from_sleep_history',
      sampleSize: 5,
    });
  });

  test('returns not enough data before the current window has five sleep days', () => {
    const debt = buildEstimatedSleepDebt({
      sleepNeed: {
        status: 'ready',
        seconds: 28_800,
        displayValue: '8h 0m',
        method: 'sleep_total_p75',
        source: 'sleep_total_all_sessions',
        sampleSize: 5,
        minSampleSize: 5,
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
