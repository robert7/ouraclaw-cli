import { compareIsoDates, formatDuration, parseIsoDate } from './date-utils';
import { percentile } from './statistics';
import {
  DerivedSleepNeedBaseline,
  EstimatedSleepDebt,
  EstimatedSleepDebtStatus,
  SleepPeriod,
} from './types';

export const SLEEP_DEBT_WINDOW_DAYS = 14;
export const SLEEP_DEBT_MIN_SAMPLE_DAYS = 5;
export const SLEEP_DEBT_DECAY_FACTOR = 0.935;
export const DERIVED_SLEEP_NEED_HISTORY_DAYS = 90;
export const DERIVED_SLEEP_NEED_MIN_SAMPLE_DAYS = 14;
const DERIVED_SLEEP_NEED_LOWER_TRIM_PERCENTILE = 0.1;
const DERIVED_SLEEP_NEED_UPPER_TRIM_PERCENTILE = 0.9;
const DISPLAY_ROUNDING_SECONDS = 10 * 60;

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

function roundToDisplaySeconds(value: number): number {
  return Math.round(value / DISPLAY_ROUNDING_SECONDS) * DISPLAY_ROUNDING_SECONDS;
}

function getDayGap(leftDay: string, rightDay: string): number {
  const left = parseIsoDate(leftDay).getTime();
  const right = parseIsoDate(rightDay).getTime();
  return Math.max(1, Math.round((right - left) / 86_400_000));
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
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
  dayTotals: SleepDayTotal[],
  sourceStartDay?: string,
  sourceEndDay?: string
): DerivedSleepNeedBaseline {
  const values = dayTotals
    .map((entry) => entry.totalSleepDuration)
    .filter(isFinitePositive)
    .sort((left, right) => left - right);
  const lowerTrimBound =
    values.length > 0 ? percentile(values, DERIVED_SLEEP_NEED_LOWER_TRIM_PERCENTILE) : null;
  const upperTrimBound =
    values.length > 0 ? percentile(values, DERIVED_SLEEP_NEED_UPPER_TRIM_PERCENTILE) : null;
  const trimmedValues =
    lowerTrimBound == null || upperTrimBound == null
      ? []
      : values.filter((value) => value >= lowerTrimBound && value <= upperTrimBound);

  const base = {
    method: 'sleep_total_trimmed_mean_90d' as const,
    source: 'sleep_total_all_sessions' as const,
    historyDays: DERIVED_SLEEP_NEED_HISTORY_DAYS,
    sampleSize: values.length,
    trimmedSampleSize: trimmedValues.length,
    minSampleSize: DERIVED_SLEEP_NEED_MIN_SAMPLE_DAYS,
    lowerTrimPercentile: DERIVED_SLEEP_NEED_LOWER_TRIM_PERCENTILE,
    upperTrimPercentile: DERIVED_SLEEP_NEED_UPPER_TRIM_PERCENTILE,
    sourceStartDay: sourceStartDay ?? dayTotals[0]?.day ?? null,
    sourceEndDay: sourceEndDay ?? dayTotals.at(-1)?.day ?? null,
  };

  if (values.length < DERIVED_SLEEP_NEED_MIN_SAMPLE_DAYS) {
    return {
      ...base,
      status: 'not_enough_data',
      seconds: null,
      displayValue: null,
    };
  }

  const seconds = roundToDisplaySeconds(mean(trimmedValues.length > 0 ? trimmedValues : values));
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
    method: 'decayed_signed_balance' as const,
    decayFactor: SLEEP_DEBT_DECAY_FACTOR,
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

  let previousDay: string | undefined;
  const debtSeconds = input.dayTotals
    .filter((entry) => isFinitePositive(entry.totalSleepDuration))
    .sort((left, right) => compareIsoDates(left.day, right.day))
    .reduce((total, entry) => {
      const decayMultiplier =
        previousDay === undefined
          ? 1
          : SLEEP_DEBT_DECAY_FACTOR ** getDayGap(previousDay, entry.day);
      previousDay = entry.day;
      const balance = total * decayMultiplier + sleepNeedSeconds - entry.totalSleepDuration;
      return Math.max(0, balance);
    }, 0);
  const roundedDebtSeconds = roundToDisplaySeconds(debtSeconds);

  return {
    ...base,
    status: getEstimatedSleepDebtStatus(roundedDebtSeconds),
    valueSeconds: roundedDebtSeconds,
    displayValue: formatDuration(roundedDebtSeconds),
  };
}
