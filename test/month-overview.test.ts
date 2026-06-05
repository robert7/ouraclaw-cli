import { describe, expect, test } from 'vitest';

import { defaultBaselineConfig } from '../src/baseline';
import {
  buildMonthOverview,
  buildMonthOverviewText,
  resolveMonthOverviewDateRange,
} from '../src/month-overview';

describe('month-overview', () => {
  test('resolves the last 30 completed days', () => {
    const range = resolveMonthOverviewDateRange(new Date('2026-06-05T10:00:00.000Z'));

    expect(range).toEqual({
      start: '2026-05-06',
      end: '2026-06-04',
      mode: 'last-30-days',
      days: expect.arrayContaining(['2026-05-06', '2026-06-04']),
    });
    expect(range.days).toHaveLength(30);
  });

  test('builds rolling 30-day medians with configured percentile band', () => {
    const result = buildMonthOverview({
      startDay: '2026-04-01',
      endDay: '2026-04-05',
      timezone: 'Europe/Bratislava',
      days: ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05'],
      records: [
        {
          day: '2026-04-01',
          sleepScore: 70,
          readinessScore: 60,
          totalSleepDuration: 21600,
          deepSleepDuration: 3000,
          averageHrv: 15,
          lowestHeartRate: 55,
          temperatureDeviation: -0.2,
        },
        {
          day: '2026-04-02',
          sleepScore: 75,
          readinessScore: 65,
          totalSleepDuration: 23400,
          deepSleepDuration: 3600,
          averageHrv: 18,
          lowestHeartRate: 58,
          temperatureDeviation: -0.1,
        },
        {
          day: '2026-04-03',
          sleepScore: 80,
          readinessScore: 70,
          totalSleepDuration: 25200,
          deepSleepDuration: 4200,
          averageHrv: 21,
          lowestHeartRate: 61,
          temperatureDeviation: 0,
        },
        {
          day: '2026-04-04',
          sleepScore: 85,
          readinessScore: 75,
          totalSleepDuration: 27000,
          deepSleepDuration: 4800,
          averageHrv: 24,
          lowestHeartRate: 64,
          temperatureDeviation: 0.1,
        },
        {
          day: '2026-04-05',
          sleepScore: 90,
          readinessScore: 80,
          totalSleepDuration: 28800,
          deepSleepDuration: 5400,
          averageHrv: 27,
          lowestHeartRate: 67,
          temperatureDeviation: 0.2,
        },
      ],
      activityRecords: [
        {
          id: 'activity-1',
          day: '2026-04-01',
          score: 70,
          timestamp: '',
          active_calories: 100,
          total_calories: 2000,
          steps: 5000,
        },
        {
          id: 'activity-2',
          day: '2026-04-02',
          score: 75,
          timestamp: '',
          active_calories: 200,
          total_calories: 2100,
          steps: 7000,
        },
        {
          id: 'activity-3',
          day: '2026-04-03',
          score: 80,
          timestamp: '',
          active_calories: 300,
          total_calories: 2200,
          steps: 9000,
        },
        {
          id: 'activity-4',
          day: '2026-04-04',
          score: 85,
          timestamp: '',
          active_calories: 400,
          total_calories: 2300,
          steps: 11000,
        },
        {
          id: 'activity-5',
          day: '2026-04-05',
          score: 90,
          timestamp: '',
          active_calories: 500,
          total_calories: 2400,
          steps: 13000,
        },
      ],
      baselineConfig: defaultBaselineConfig(),
    });

    expect(result.percentileBand).toEqual({
      lower: 25,
      upper: 75,
      label: 'P25-P75',
    });
    expect(result.metricOrder).toEqual([
      'sleepScore',
      'totalSleepDuration',
      'deepSleepDuration',
      'readinessScore',
      'averageHrv',
      'lowestHeartRate',
      'temperatureDeviation',
      'steps',
    ]);
    expect(result.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'sleepScore',
          median: 80,
          low: 75,
          high: 85,
          displayMedian: '80',
          displayRange: '75-85',
        }),
        expect.objectContaining({
          key: 'deepSleepDuration',
          displayMedian: '1h 10m',
          displayRange: '1h 0m-1h 20m',
        }),
        expect.objectContaining({
          key: 'steps',
          displayMedian: '9.0k',
          displayRange: '7.0k-11k',
        }),
      ])
    );
    expect(result.dataCoverage).toEqual({
      sleepDays: 5,
      readinessDays: 5,
      activityDays: 5,
      totalDays: 5,
    });
    expect(buildMonthOverviewText(result)).toBe(
      [
        'Oura 30-day recap · Apr 1-Apr 5 · medians with P25-P75',
        '',
        'Sleep: 80 (75-85) | Total 7h 0m (6h 30m-7h 30m) | Deep 1h 10m (1h 0m-1h 20m)',
        'Readiness: 70 (65-75) | HRV 21 ms (18-24) | Lowest HR 61 bpm (58-64)',
        'Temp: +0.0C (-0.1 to +0.1) | Steps 9.0k (7.0k-11k)',
        '',
        'Data: 5/5 sleep days · 5/5 activity days',
      ].join('\n')
    );
  });
});
