import { compareIsoDates, formatDuration } from './date-utils';
import { percentile } from './statistics';
import {
  DerivedSleepNeedBaseline,
  EstimatedSleepDebt,
  EstimatedSleepDebtStatus,
  SleepPeriod,
} from './types';

export const SLEEP_DEBT_WINDOW_DAYS = 14;
export const SLEEP_DEBT_MIN_SAMPLE_DAYS = 5;
export const DERIVED_SLEEP_NEED_MIN_SAMPLE_DAYS = 5;

export interface SleepDayTotal {
  day: string;
  totalSleepDuration: number;
}

function isFinitePositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isWithinRange(day: string, startDay?: string, endDay?: string): boolean {
  return (
    (!startDay || compareIsoDates(day, startDay) >= 0) &&
    (!endDay || compareIsoDates(day, endDay) <= 0)
  );
}

export function buildSleepDayTotals(
  records: SleepPeriod[],
  startDay?: string,
  endDay?: string
): SleepDayTotal[] {
  const totals = new Map<string, number>();

  for (const record of records) {
    if (
      record.type === 'deleted' ||
      !isWithinRange(record.day, startDay, endDay) ||
      !isFinitePositive(record.total_sleep_duration)
    ) {
      continue;
    }

    totals.set(record.day, (totals.get(record.day) ?? 0) + record.total_sleep_duration);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => compareIsoDates(left, right))
    .map(([day, totalSleepDuration]) => ({ day, totalSleepDuration }));
}

export function buildDerivedSleepNeedBaseline(
  dayTotals: SleepDayTotal[]
): DerivedSleepNeedBaseline {
  const values = dayTotals
    .map((entry) => entry.totalSleepDuration)
    .filter(isFinitePositive)
    .sort((left, right) => left - right);

  const base = {
    method: 'sleep_total_p75' as const,
    source: 'sleep_total_all_sessions' as const,
    sampleSize: values.length,
    minSampleSize: DERIVED_SLEEP_NEED_MIN_SAMPLE_DAYS,
  };

  if (values.length < DERIVED_SLEEP_NEED_MIN_SAMPLE_DAYS) {
    return {
      ...base,
      status: 'not_enough_data',
      seconds: null,
      displayValue: null,
    };
  }

  const seconds = Math.round(percentile(values, 0.75));
  return {
    ...base,
    status: 'ready',
    seconds,
    displayValue: formatDuration(seconds),
  };
}

function getEstimatedSleepDebtStatus(valueSeconds: number): EstimatedSleepDebtStatus {
  if (valueSeconds <= 0) {
    return 'none';
  }

  if (valueSeconds < 2 * 60 * 60) {
    return 'low';
  }

  if (valueSeconds <= 5 * 60 * 60) {
    return 'moderate';
  }

  return 'high';
}

export function buildEstimatedSleepDebt(input: {
  sleepNeed: DerivedSleepNeedBaseline | undefined;
  dayTotals: SleepDayTotal[];
  startDay: string;
  endDay: string;
}): EstimatedSleepDebt {
  const sleepNeedSeconds = input.sleepNeed?.seconds;
  const sampleSize = input.dayTotals.filter((entry) =>
    isFinitePositive(entry.totalSleepDuration)
  ).length;
  const base = {
    source: 'derived_from_sleep_history' as const,
    windowDays: SLEEP_DEBT_WINDOW_DAYS,
    startDay: input.startDay,
    endDay: input.endDay,
    sampleSize,
    minSampleSize: SLEEP_DEBT_MIN_SAMPLE_DAYS,
    sleepNeedSeconds: input.sleepNeed?.seconds ?? null,
    sleepNeedDisplayValue: input.sleepNeed?.displayValue ?? null,
  };

  if (
    sampleSize < SLEEP_DEBT_MIN_SAMPLE_DAYS ||
    !input.sleepNeed ||
    input.sleepNeed.status !== 'ready' ||
    !isFinitePositive(sleepNeedSeconds)
  ) {
    return {
      ...base,
      status: 'not_enough_data',
      valueSeconds: null,
      displayValue: null,
    };
  }

  const debtSeconds = input.dayTotals.reduce(
    (total, entry) => total + Math.max(0, sleepNeedSeconds - entry.totalSleepDuration),
    0
  );

  return {
    ...base,
    status: getEstimatedSleepDebtStatus(debtSeconds),
    valueSeconds: debtSeconds,
    displayValue: formatDuration(debtSeconds),
  };
}
