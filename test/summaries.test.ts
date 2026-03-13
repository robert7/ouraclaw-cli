import { describe, expect, test } from 'vitest';

import {
  buildEveningSummary,
  buildMorningSummary,
  selectPreferredSleepRecord,
} from '../src/summaries';

describe('summaries', () => {
  test('prefers long sleep record for the target day', () => {
    const record = selectPreferredSleepRecord(
      [
        {
          id: '1',
          day: '2026-03-13',
          bedtime_start: '',
          bedtime_end: '',
          duration: 1,
          total_sleep_duration: 1,
          awake_time: 1,
          light_sleep_duration: 1,
          deep_sleep_duration: 1,
          rem_sleep_duration: 1,
          efficiency: 1,
          average_heart_rate: 60,
          lowest_heart_rate: 50,
          average_hrv: 40,
          type: 'nap',
        },
        {
          id: '2',
          day: '2026-03-13',
          bedtime_start: '',
          bedtime_end: '',
          duration: 2,
          total_sleep_duration: 2,
          awake_time: 2,
          light_sleep_duration: 2,
          deep_sleep_duration: 2,
          rem_sleep_duration: 2,
          efficiency: 2,
          average_heart_rate: 58,
          lowest_heart_rate: 48,
          average_hrv: 42,
          type: 'long_sleep',
        },
      ],
      '2026-03-13'
    );

    expect(record?.id).toBe('2');
  });

  test('builds a morning summary message', () => {
    const result = buildMorningSummary({
      day: '2026-03-13',
      dailySleep: {
        id: 'sleep',
        day: '2026-03-13',
        score: 82,
        timestamp: '',
        contributors: {} as never,
      },
      dailyReadiness: {
        id: 'ready',
        day: '2026-03-13',
        score: 78,
        timestamp: '',
        temperature_deviation: 0.1,
        temperature_trend_deviation: 0,
        contributors: {} as never,
      },
      dailyActivity: {
        id: 'activity',
        day: '2026-03-13',
        score: 76,
        timestamp: '',
        active_calories: 320,
        total_calories: 2100,
        steps: 8500,
      },
      dailyStress: {
        id: 'stress',
        day: '2026-03-13',
        stress_high: 10,
        recovery_high: 5,
        day_summary: 'normal',
      },
      sleepRecord: {
        id: 'period',
        day: '2026-03-13',
        bedtime_start: '',
        bedtime_end: '',
        duration: 28800,
        total_sleep_duration: 27000,
        awake_time: 1000,
        light_sleep_duration: 10000,
        deep_sleep_duration: 4000,
        rem_sleep_duration: 5000,
        efficiency: 90,
        average_heart_rate: 56,
        lowest_heart_rate: 49,
        average_hrv: 41,
        type: 'long_sleep',
      },
    });

    expect(result.message).toContain('Good morning!');
    expect(result.message).toContain('Sleep: 82 (Good)');
    expect(result.missing).toEqual([]);
  });

  test('builds an evening summary message', () => {
    const result = buildEveningSummary({
      day: '2026-03-13',
      dailySleep: {
        id: 'sleep',
        day: '2026-03-13',
        score: 81,
        timestamp: '',
        contributors: {} as never,
      },
      dailyReadiness: {
        id: 'ready',
        day: '2026-03-13',
        score: 74,
        timestamp: '',
        temperature_deviation: 0,
        temperature_trend_deviation: 0,
        contributors: {} as never,
      },
      dailyActivity: {
        id: 'activity',
        day: '2026-03-13',
        score: 79,
        timestamp: '',
        active_calories: 350,
        total_calories: 2200,
        steps: 9200,
      },
      dailyStress: {
        id: 'stress',
        day: '2026-03-13',
        stress_high: 10,
        recovery_high: 5,
        day_summary: 'steady',
      },
    });

    expect(result.message).toContain('Good evening!');
    expect(result.message).toContain("Last night's sleep: 81 (Good)");
  });

  test('reports missing values without yesterday fallback', () => {
    const result = buildMorningSummary({
      day: '2026-03-13',
    });

    expect(result.missing).toEqual(['sleep_score', 'readiness_score', 'activity_score']);
    expect(result.message).toContain('n/a');
    expect(result.message).toContain('not available yet');
  });
});
