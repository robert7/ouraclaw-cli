import { describe, expect, test } from 'vitest';

import { defaultBaselineConfig } from '../src/baseline';
import { defaultThresholds } from '../src/thresholds';
import { BaselineSnapshot } from '../src/types';
import { buildWeekOverview, buildWeekOverviewText } from '../src/week-overview';

const baseline: BaselineSnapshot = {
  mode: 'calendar-weeks',
  updatedAt: '2026-04-10T00:00:00.000Z',
  sourceStartDay: '2026-03-16',
  sourceEndDay: '2026-04-05',
  weeks: ['2026-W12', '2026-W13', '2026-W14'],
  metrics: {
    sleepScore: { median: 85, low: 80, high: 90, sampleSize: 21 },
    readinessScore: { median: 84, low: 80, high: 88, sampleSize: 21 },
    temperatureDeviation: { median: 0, low: -0.1, high: 0.1, sampleSize: 21 },
    averageHrv: { median: 40, low: 35, high: 45, sampleSize: 21 },
    lowestHeartRate: { median: 50, low: 48, high: 52, sampleSize: 21 },
    totalSleepDuration: { median: 27000, low: 25000, high: 29000, sampleSize: 21 },
    deepSleepDuration: { median: 4500, low: 4000, high: 5200, sampleSize: 21 },
    remSleepDuration: { median: 5200, low: 4800, high: 5800, sampleSize: 21 },
  },
};

describe('week-overview', () => {
  test('builds seven daily rows with metric attention details and overview totals', () => {
    const result = buildWeekOverview({
      startDay: '2026-04-04',
      endDay: '2026-04-10',
      timezone: 'Europe/Vienna',
      mode: 'last-7-days',
      days: [
        '2026-04-04',
        '2026-04-05',
        '2026-04-06',
        '2026-04-07',
        '2026-04-08',
        '2026-04-09',
        '2026-04-10',
      ],
      records: [
        {
          day: '2026-04-04',
          sleepScore: 86,
          readinessScore: 85,
          temperatureDeviation: 0,
          averageHrv: 41,
          lowestHeartRate: 49,
          totalSleepDuration: 28000,
          deepSleepDuration: 4200,
          remSleepDuration: 5200,
        },
        {
          day: '2026-04-05',
          sleepScore: 81,
          readinessScore: 82,
          temperatureDeviation: 0,
          averageHrv: 30,
          lowestHeartRate: 55,
          totalSleepDuration: 27000,
          deepSleepDuration: 3900,
          remSleepDuration: 4500,
        },
        {
          day: '2026-04-06',
          sleepScore: 82,
          readinessScore: 83,
          temperatureDeviation: 0,
          averageHrv: 50,
          lowestHeartRate: 46,
          totalSleepDuration: 26000,
          deepSleepDuration: 4200,
          remSleepDuration: 5200,
        },
        {
          day: '2026-04-07',
          sleepScore: 82,
          readinessScore: 83,
          temperatureDeviation: 0,
          averageHrv: 30,
          lowestHeartRate: 49,
          totalSleepDuration: 26000,
          deepSleepDuration: 4300,
          remSleepDuration: 5200,
        },
      ],
      activityRecords: [
        {
          id: 'activity-1',
          day: '2026-04-04',
          score: 83,
          timestamp: '',
          active_calories: 320,
          total_calories: 2200,
          steps: 8300,
        },
        {
          id: 'activity-2',
          day: '2026-04-05',
          score: 79,
          timestamp: '',
          active_calories: 410,
          total_calories: 2340,
          steps: 9200,
        },
        {
          id: 'activity-3',
          day: '2026-04-06',
          score: 88,
          timestamp: '',
          active_calories: 500,
          total_calories: 2450,
          steps: 12100,
        },
      ],
      stressRecords: [
        {
          id: 'stress-1',
          day: '2026-04-04',
          stress_high: 20,
          recovery_high: 15,
          day_summary: 'steady',
        },
        {
          id: 'stress-2',
          day: '2026-04-05',
          stress_high: 35,
          recovery_high: 5,
          day_summary: 'stressful',
        },
        {
          id: 'stress-3',
          day: '2026-04-06',
          stress_high: 15,
          recovery_high: 20,
          day_summary: 'steady',
        },
      ],
      thresholds: defaultThresholds(),
      baselineConfig: defaultBaselineConfig(),
      baseline,
      baselineStatus: 'ready',
    });

    expect(result.period).toEqual({
      mode: 'last-7-days',
      startDay: '2026-04-04',
      endDay: '2026-04-10',
      timezone: 'Europe/Vienna',
    });
    expect(result.days).toHaveLength(7);
    expect(result.metricOrder).toEqual([
      'sleepScore',
      'readinessScore',
      'totalSleepDuration',
      'deepSleepDuration',
      'remSleepDuration',
      'temperatureDeviation',
      'lowestHeartRate',
      'averageHrv',
    ]);
    expect(result.overview.readyDays).toBe(4);
    expect(result.overview.attentionDays).toBe(1);
    expect(result.overview.topAttentionMetrics).toEqual([
      { metric: 'averageHrv', count: 1 },
      { metric: 'deepSleepDuration', count: 1 },
      { metric: 'lowestHeartRate', count: 1 },
      { metric: 'remSleepDuration', count: 1 },
    ]);
    expect(result.overview.totalSteps).toBe(29600);
    expect(result.overview.averageSteps).toBe(9867);
    expect(result.overview.topStressSummaries).toEqual([
      { summary: 'steady', count: 2 },
      { summary: 'stressful', count: 1 },
    ]);
    expect(result.days[1]).toEqual(
      expect.objectContaining({
        day: '2026-04-05',
        weekday: 'Sunday',
        shouldAlert: true,
        summaryLine:
          'Sleep 81 | Readiness 82 | Total 7h 30m | ⚠️ Deep 1h 5m | ⚠️ REM 1h 15m | Temp +0.0C | ⚠️ Lowest HR 55 bpm | ⚠️ HRV 30 ms',
        attentionMetrics: [
          'deepSleepDuration',
          'remSleepDuration',
          'lowestHeartRate',
          'averageHrv',
        ],
        missingMetrics: [],
        activity: {
          score: 79,
          steps: 9200,
          activeCalories: 410,
          totalCalories: 2340,
        },
        stress: {
          daySummary: 'stressful',
          stressHigh: 35,
          recoveryHigh: 5,
        },
      })
    );
    expect(result.days[1].metrics).toEqual(
      expect.arrayContaining([
        {
          key: 'deepSleepDuration',
          value: 3900,
          unit: 'seconds',
          displayValue: '1h 5m',
          attention: true,
        },
        {
          key: 'remSleepDuration',
          value: 4500,
          unit: 'seconds',
          displayValue: '1h 15m',
          attention: true,
        },
        {
          key: 'averageHrv',
          value: 30,
          unit: 'milliseconds',
          displayValue: '30 ms',
          attention: true,
        },
      ])
    );
    expect(result.days[2].shouldAlert).toBe(false);
    expect(result.days[2].metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'averageHrv',
          attention: false,
        }),
      ])
    );
    expect(result.days[3]).toEqual(
      expect.objectContaining({
        day: '2026-04-07',
        shouldAlert: false,
        summaryLine:
          'Sleep 82 | Readiness 83 | Total 7h 13m | Deep 1h 12m | REM 1h 27m | Temp +0.0C | Lowest HR 49 bpm | HRV 30 ms',
        attentionMetrics: [],
        activity: {
          score: null,
          steps: null,
          activeCalories: null,
          totalCalories: null,
        },
        stress: {
          daySummary: null,
          stressHigh: null,
          recoveryHigh: null,
        },
      })
    );
    expect(result.days[6]).toEqual(
      expect.objectContaining({
        day: '2026-04-10',
        dataReady: false,
        summaryLine: '',
        missingMetrics: [
          'sleepScore',
          'readinessScore',
          'totalSleepDuration',
          'deepSleepDuration',
          'remSleepDuration',
          'temperatureDeviation',
          'lowestHeartRate',
          'averageHrv',
        ],
        metrics: [],
      })
    );
  });

  test('renders compact english text output', () => {
    const result = buildWeekOverview({
      startDay: '2026-04-13',
      endDay: '2026-04-19',
      timezone: 'Europe/Bratislava',
      mode: 'last-7-days',
      days: [
        '2026-04-13',
        '2026-04-14',
        '2026-04-15',
        '2026-04-16',
        '2026-04-17',
        '2026-04-18',
        '2026-04-19',
      ],
      records: [
        {
          day: '2026-04-13',
          sleepScore: 86,
          readinessScore: 85,
          temperatureDeviation: 0,
          averageHrv: 41,
          lowestHeartRate: 49,
          totalSleepDuration: 28000,
          deepSleepDuration: 4200,
          remSleepDuration: 5200,
        },
        {
          day: '2026-04-14',
          sleepScore: 81,
          readinessScore: 82,
          temperatureDeviation: 0,
          averageHrv: 30,
          lowestHeartRate: 55,
          totalSleepDuration: 27000,
          deepSleepDuration: 3900,
          remSleepDuration: 4500,
        },
      ],
      activityRecords: [
        {
          id: 'activity-1',
          day: '2026-04-13',
          score: 86,
          timestamp: '',
          active_calories: 320,
          total_calories: 2200,
          steps: 8300,
        },
        {
          id: 'activity-2',
          day: '2026-04-14',
          score: 79,
          timestamp: '',
          active_calories: 410,
          total_calories: 2340,
          steps: 9200,
        },
      ],
      stressRecords: [
        {
          id: 'stress-1',
          day: '2026-04-13',
          stress_high: 20,
          recovery_high: 15,
          day_summary: 'steady',
        },
        {
          id: 'stress-2',
          day: '2026-04-14',
          stress_high: 35,
          recovery_high: 5,
          day_summary: 'stressful',
        },
      ],
      thresholds: defaultThresholds(),
      baselineConfig: defaultBaselineConfig(),
      baseline,
      baselineStatus: 'ready',
    });

    expect(buildWeekOverviewText(result)).toBe(
      [
        'Your Oura overview for Apr 13 - Apr 19.',
        '',
        'Mon: Sleep 86 | Readiness 85 | Total 7h 47m | Deep 1h 10m | REM 1h 27m | Temp +0.0C | Lowest HR 49 bpm | HRV 41 ms | Steps 8.3k | Stress steady',
        'Tue: Sleep 81 | Readiness 82 | Total 7h 30m | ⚠️ Deep 1h 5m | ⚠️ REM 1h 15m | Temp +0.0C | ⚠️ Lowest HR 55 bpm | ⚠️ HRV 30 ms | Steps 9.2k | Stress stressful',
        'Wed: data not ready',
        'Thu: data not ready',
        'Fri: data not ready',
        'Sat: data not ready',
        'Sun: data not ready',
        '',
        'Main pattern: HRV was the most repeated attention signal this week.',
      ].join('\n')
    );
    expect(
      buildWeekOverviewText({
        ...result,
        overview: {
          ...result.overview,
          topAttentionMetrics: [{ metric: 'deepSleepDuration', count: 2 }],
        },
      })
    ).toContain('Main pattern: deep sleep was the most repeated attention signal this week.');
    expect(
      buildWeekOverviewText({
        ...result,
        overview: {
          ...result.overview,
          topAttentionMetrics: [{ metric: 'remSleepDuration', count: 2 }],
        },
      })
    ).toContain('Main pattern: REM sleep was the most repeated attention signal this week.');
  });
});
