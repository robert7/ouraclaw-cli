import { BASELINE_METRICS, DEFAULT_BASELINE_CONFIG } from './config';
import { addDays, getIsoWeekString, getWeekStartMonday, toIsoDate } from './date-utils';
import { buildMetricSnapshot } from './statistics';
import {
  BaselineConfig,
  BaselineMetricKey,
  BaselineMetricSnapshot,
  BaselineSnapshot,
  OuraRecord,
} from './types';

export function validateBaselineConfig(input: unknown): BaselineConfig {
  const candidate = input as Partial<BaselineConfig>;
  const config = {
    lowerPercentile: Number(candidate.lowerPercentile),
    supportingMetricAlertCount: Number(candidate.supportingMetricAlertCount),
  };

  if (
    !Number.isFinite(config.lowerPercentile) ||
    !Number.isFinite(config.supportingMetricAlertCount)
  ) {
    throw new Error('Baseline configuration must be numeric.');
  }

  if (config.lowerPercentile <= 0 || config.lowerPercentile >= 50) {
    throw new Error('baseline lower percentile must be greater than 0 and less than 50.');
  }

  if (!Number.isInteger(config.supportingMetricAlertCount)) {
    throw new Error('baseline supporting metric alert count must be an integer.');
  }

  if (config.supportingMetricAlertCount < 1 || config.supportingMetricAlertCount > 3) {
    throw new Error('baseline supporting metric alert count must be between 1 and 3.');
  }

  return config;
}

export function defaultBaselineConfig(): BaselineConfig {
  return {
    lowerPercentile: DEFAULT_BASELINE_CONFIG.lowerPercentile,
    supportingMetricAlertCount: DEFAULT_BASELINE_CONFIG.supportingMetricAlertCount,
  };
}

function buildMetrics(records: OuraRecord[], baselineConfig: BaselineConfig) {
  const metrics = Object.fromEntries(
    BASELINE_METRICS.map((key) => {
      const values = records
        .map((record) => record[key])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      return [key, buildMetricSnapshot(values, baselineConfig.lowerPercentile)];
    })
  ) as Partial<Record<BaselineMetricKey, BaselineMetricSnapshot>>;

  return metrics;
}

export function getAutomaticBaselineWindow(referenceDate: Date) {
  const lastMonday = getWeekStartMonday(referenceDate);
  const start = addDays(lastMonday, -21);
  const end = addDays(lastMonday, -1);
  const weeks = [0, 7, 14].map((offset) => getIsoWeekString(addDays(start, offset)));
  return {
    startDay: toIsoDate(start),
    endDay: toIsoDate(end),
    weeks,
  };
}

export function getManualBaselineWindow(referenceDate: Date) {
  const today = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const end = addDays(today, -1);
  const start = addDays(end, -20);
  return {
    startDay: toIsoDate(start),
    endDay: toIsoDate(end),
  };
}

export function rebuildAutomaticBaseline(
  referenceDate: Date,
  records: OuraRecord[],
  baselineConfig: BaselineConfig = defaultBaselineConfig()
): BaselineSnapshot {
  const window = getAutomaticBaselineWindow(referenceDate);
  return {
    mode: 'calendar-weeks',
    updatedAt: new Date().toISOString(),
    sourceStartDay: window.startDay,
    sourceEndDay: window.endDay,
    weeks: window.weeks,
    metrics: buildMetrics(records, baselineConfig),
  };
}

export function rebuildManualBaseline(
  referenceDate: Date,
  records: OuraRecord[],
  baselineConfig: BaselineConfig = defaultBaselineConfig()
): BaselineSnapshot {
  const window = getManualBaselineWindow(referenceDate);
  return {
    mode: 'rolling-21-days',
    updatedAt: new Date().toISOString(),
    sourceStartDay: window.startDay,
    sourceEndDay: window.endDay,
    metrics: buildMetrics(records, baselineConfig),
  };
}

export function isBaselineStale(snapshot: BaselineSnapshot, now: Date): boolean {
  return now.getTime() - new Date(snapshot.updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000;
}
