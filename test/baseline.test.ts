import { describe, expect, test } from 'vitest';

import {
  defaultBaselineConfig,
  getAutomaticBaselineWindow,
  getManualBaselineWindow,
  isBaselineComplete,
  isBaselineStale,
  rebuildAutomaticBaseline,
  rebuildManualBaseline,
} from '../src/baseline';

describe('baseline', () => {
  test('computes automatic window from last monday', () => {
    const window = getAutomaticBaselineWindow(new Date(Date.UTC(2026, 2, 13)));

    expect(window).toEqual({
      startDay: '2026-02-16',
      endDay: '2026-03-08',
      weeks: ['2026-W08', '2026-W09', '2026-W10'],
    });
  });

  test('computes manual rolling window', () => {
    const window = getManualBaselineWindow(new Date(Date.UTC(2026, 2, 13)));

    expect(window).toEqual({
      startDay: '2026-02-20',
      endDay: '2026-03-12',
    });
  });

  test('builds metric bounds for automatic baseline', () => {
    const baseline = rebuildAutomaticBaseline(
      new Date(Date.UTC(2026, 2, 13)),
      [
        {
          day: '2026-03-01',
          averageHrv: 40,
          lowestHeartRate: 52,
          totalSleepDuration: 25000,
          deepSleepDuration: 3000,
          remSleepDuration: 4000,
        },
        {
          day: '2026-03-02',
          averageHrv: 42,
          lowestHeartRate: 51,
          totalSleepDuration: 25500,
          deepSleepDuration: 3600,
          remSleepDuration: 4300,
        },
        {
          day: '2026-03-03',
          averageHrv: 44,
          lowestHeartRate: 50,
          totalSleepDuration: 26000,
          deepSleepDuration: 4200,
          remSleepDuration: 4600,
        },
        {
          day: '2026-03-04',
          averageHrv: 46,
          lowestHeartRate: 49,
          totalSleepDuration: 26500,
          deepSleepDuration: 4800,
          remSleepDuration: 4900,
        },
      ],
      defaultBaselineConfig(),
      [
        { day: '2026-03-01', totalSleepDuration: 25_200 },
        { day: '2026-03-02', totalSleepDuration: 26_100 },
        { day: '2026-03-03', totalSleepDuration: 27_000 },
        { day: '2026-03-04', totalSleepDuration: 28_800 },
        { day: '2026-03-05', totalSleepDuration: 30_600 },
      ]
    );

    expect(baseline.mode).toBe('calendar-weeks');
    expect(baseline.metrics.averageHrv?.median).toBe(43);
    expect(baseline.metrics.lowestHeartRate?.low).toBe(49.75);
    expect(baseline.metrics.totalSleepDuration?.high).toBe(26125);
    expect(baseline.metrics.deepSleepDuration?.median).toBe(3900);
    expect(baseline.metrics.remSleepDuration?.low).toBe(4225);
    expect(baseline.derived?.sleepNeed).toMatchObject({
      status: 'ready',
      seconds: 28_800,
      source: 'sleep_total_all_sessions',
    });
  });

  test('detects whether a baseline includes all current metrics', () => {
    const complete = rebuildAutomaticBaseline(new Date(Date.UTC(2026, 2, 13)), [
      {
        day: '2026-03-01',
        sleepScore: 80,
        readinessScore: 81,
        temperatureDeviation: 0,
        averageHrv: 40,
        lowestHeartRate: 52,
        totalSleepDuration: 25000,
        deepSleepDuration: 3000,
        remSleepDuration: 4000,
      },
    ]);

    expect(isBaselineComplete(complete)).toBe(true);
    expect(
      isBaselineComplete({
        ...complete,
        metrics: {
          ...complete.metrics,
          remSleepDuration: undefined,
        },
      })
    ).toBe(false);
    expect(
      isBaselineComplete({
        ...complete,
        derived: undefined,
      })
    ).toBe(false);
  });

  test('widens the ordinary band when configured percentile is lower', () => {
    const baseline = rebuildManualBaseline(
      new Date(Date.UTC(2026, 2, 13)),
      [
        { day: '2026-03-01', sleepScore: 70 },
        { day: '2026-03-02', sleepScore: 72 },
        { day: '2026-03-03', sleepScore: 74 },
        { day: '2026-03-04', sleepScore: 76 },
        { day: '2026-03-05', sleepScore: 78 },
      ],
      {
        ...defaultBaselineConfig(),
        lowerPercentile: 10,
      }
    );

    expect(baseline.metrics.sleepScore?.low).toBeCloseTo(70.8);
    expect(baseline.metrics.sleepScore?.high).toBeCloseTo(77.2);
  });

  test('marks stale baseline after one week', () => {
    expect(
      isBaselineStale(
        {
          mode: 'rolling-21-days',
          updatedAt: '2026-03-01T00:00:00.000Z',
          sourceStartDay: '2026-02-08',
          sourceEndDay: '2026-02-28',
          metrics: {},
        },
        new Date('2026-03-13T00:00:00.000Z')
      )
    ).toBe(true);

    const fresh = rebuildManualBaseline(new Date(Date.UTC(2026, 2, 13)), []);
    expect(isBaselineStale(fresh, new Date(fresh.updatedAt))).toBe(false);
  });
});
