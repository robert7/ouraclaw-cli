import { buildMetricSnapshot } from './statistics';
import { addDays, formatDuration, getTodayIsoDate, parseIsoDate } from './date-utils';
import {
  BaselineConfig,
  DailyActivity,
  MonthOverviewMetric,
  MonthOverviewMetricKey,
  MonthOverviewResult,
  OuraRecord,
} from './types';

const metricOrder: MonthOverviewMetricKey[] = [
  'sleepScore',
  'totalSleepDuration',
  'deepSleepDuration',
  'readinessScore',
  'averageHrv',
  'lowestHeartRate',
  'temperatureDeviation',
  'steps',
];

const metricUnits: Record<MonthOverviewMetricKey, MonthOverviewMetric['unit']> = {
  sleepScore: 'score',
  totalSleepDuration: 'seconds',
  deepSleepDuration: 'seconds',
  readinessScore: 'score',
  averageHrv: 'milliseconds',
  lowestHeartRate: 'bpm',
  temperatureDeviation: 'celsius',
  steps: 'steps',
};

function formatTemperature(value: number, includeUnit = true): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}${includeUnit ? 'C' : ''}`;
}

function formatRounded(value: number): string {
  return String(Math.round(value));
}

function formatSteps(steps: number): string {
  if (steps >= 10_000) {
    const rounded = Math.round((steps / 1000) * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded.toFixed(0)}k` : `${rounded.toFixed(1)}k`;
  }
  if (steps >= 1000) {
    return `${(Math.round((steps / 1000) * 10) / 10).toFixed(1)}k`;
  }
  return String(Math.round(steps));
}

function formatMetricValue(metric: MonthOverviewMetricKey, value: number): string {
  switch (metric) {
    case 'sleepScore':
    case 'readinessScore':
      return formatRounded(value);
    case 'totalSleepDuration':
    case 'deepSleepDuration':
      return formatDuration(value);
    case 'averageHrv':
      return `${formatRounded(value)} ms`;
    case 'lowestHeartRate':
      return `${formatRounded(value)} bpm`;
    case 'temperatureDeviation':
      return formatTemperature(value);
    case 'steps':
      return formatSteps(value);
  }
}

function formatMetricRange(metric: MonthOverviewMetricKey, low: number, high: number): string {
  switch (metric) {
    case 'sleepScore':
    case 'readinessScore':
      return `${formatRounded(low)}-${formatRounded(high)}`;
    case 'totalSleepDuration':
    case 'deepSleepDuration':
      return `${formatDuration(low)}-${formatDuration(high)}`;
    case 'averageHrv':
    case 'lowestHeartRate':
      return `${formatRounded(low)}-${formatRounded(high)}`;
    case 'temperatureDeviation':
      return `${formatTemperature(low, false)} to ${formatTemperature(high, false)}`;
    case 'steps':
      return `${formatSteps(low)}-${formatSteps(high)}`;
  }
}

function finiteValues(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
}

function buildMonthMetric(
  key: MonthOverviewMetricKey,
  values: number[],
  lowerPercentile: number
): MonthOverviewMetric | null {
  const snapshot = buildMetricSnapshot(values, lowerPercentile);
  if (!snapshot) {
    return null;
  }

  return {
    key,
    unit: metricUnits[key],
    median: snapshot.median,
    low: snapshot.low,
    high: snapshot.high,
    sampleSize: snapshot.sampleSize,
    displayMedian: formatMetricValue(key, snapshot.median),
    displayRange: formatMetricRange(key, snapshot.low, snapshot.high),
  };
}

function formatShortRangeDate(day: string): string {
  return parseIsoDate(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatPercentile(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function formatMetric(metric: MonthOverviewMetric): string {
  return `${metric.displayMedian} (${metric.displayRange})`;
}

function maxSampleSize(metrics: Array<MonthOverviewMetric | undefined>): number {
  return Math.max(0, ...metrics.map((metric) => metric?.sampleSize ?? 0));
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let current = parseIsoDate(start);
  const last = parseIsoDate(end);
  while (current.getTime() <= last.getTime()) {
    days.push(getTodayIsoDate(current));
    current = addDays(current, 1);
  }
  return days;
}

export function resolveMonthOverviewDateRange(referenceDate = new Date()) {
  const today = getTodayIsoDate(referenceDate);
  const end = getTodayIsoDate(addDays(parseIsoDate(today), -1));
  const start = getTodayIsoDate(addDays(parseIsoDate(end), -29));

  return {
    start,
    end,
    mode: 'last-30-days' as const,
    days: enumerateDays(start, end),
  };
}

export function buildMonthOverview(input: {
  startDay: string;
  endDay: string;
  timezone: string;
  days: string[];
  records: OuraRecord[];
  activityRecords: DailyActivity[];
  baselineConfig: BaselineConfig;
}): MonthOverviewResult {
  const lower = input.baselineConfig.lowerPercentile;
  const upper = 100 - lower;
  const metrics = [
    buildMonthMetric(
      'sleepScore',
      finiteValues(input.records.map((record) => record.sleepScore)),
      lower
    ),
    buildMonthMetric(
      'totalSleepDuration',
      finiteValues(input.records.map((record) => record.totalSleepDuration)),
      lower
    ),
    buildMonthMetric(
      'deepSleepDuration',
      finiteValues(input.records.map((record) => record.deepSleepDuration)),
      lower
    ),
    buildMonthMetric(
      'readinessScore',
      finiteValues(input.records.map((record) => record.readinessScore)),
      lower
    ),
    buildMonthMetric(
      'averageHrv',
      finiteValues(input.records.map((record) => record.averageHrv)),
      lower
    ),
    buildMonthMetric(
      'lowestHeartRate',
      finiteValues(input.records.map((record) => record.lowestHeartRate)),
      lower
    ),
    buildMonthMetric(
      'temperatureDeviation',
      finiteValues(input.records.map((record) => record.temperatureDeviation)),
      lower
    ),
    buildMonthMetric(
      'steps',
      finiteValues(input.activityRecords.map((record) => record.steps)),
      lower
    ),
  ].filter((metric): metric is MonthOverviewMetric => Boolean(metric));
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));

  return {
    period: {
      mode: 'last-30-days',
      startDay: input.startDay,
      endDay: input.endDay,
      timezone: input.timezone,
      totalDays: input.days.length,
    },
    percentileBand: {
      lower,
      upper,
      label: `P${formatPercentile(lower)}-P${formatPercentile(upper)}`,
    },
    metricOrder,
    metrics,
    dataCoverage: {
      sleepDays: maxSampleSize([
        metricByKey.get('sleepScore'),
        metricByKey.get('totalSleepDuration'),
        metricByKey.get('deepSleepDuration'),
      ]),
      readinessDays: maxSampleSize([
        metricByKey.get('readinessScore'),
        metricByKey.get('averageHrv'),
        metricByKey.get('lowestHeartRate'),
        metricByKey.get('temperatureDeviation'),
      ]),
      activityDays: metricByKey.get('steps')?.sampleSize ?? 0,
      totalDays: input.days.length,
    },
  };
}

export function buildMonthOverviewText(result: MonthOverviewResult): string {
  const metricByKey = new Map(result.metrics.map((metric) => [metric.key, metric]));
  const sleepScore = metricByKey.get('sleepScore');
  const totalSleep = metricByKey.get('totalSleepDuration');
  const deepSleep = metricByKey.get('deepSleepDuration');
  const readiness = metricByKey.get('readinessScore');
  const hrv = metricByKey.get('averageHrv');
  const lowestHeartRate = metricByKey.get('lowestHeartRate');
  const temperature = metricByKey.get('temperatureDeviation');
  const steps = metricByKey.get('steps');

  const sleepParts = [
    sleepScore ? formatMetric(sleepScore) : null,
    totalSleep ? `Total ${formatMetric(totalSleep)}` : null,
    deepSleep ? `Deep ${formatMetric(deepSleep)}` : null,
  ].filter((part): part is string => Boolean(part));
  const readinessParts = [
    readiness ? formatMetric(readiness) : null,
    hrv ? `HRV ${formatMetric(hrv)}` : null,
    lowestHeartRate ? `Lowest HR ${formatMetric(lowestHeartRate)}` : null,
  ].filter((part): part is string => Boolean(part));
  const contextParts = [
    temperature ? `Temp: ${formatMetric(temperature)}` : null,
    steps ? `Steps ${formatMetric(steps)}` : null,
  ].filter((part): part is string => Boolean(part));

  return [
    `Oura 30-day recap · ${formatShortRangeDate(result.period.startDay)}-${formatShortRangeDate(
      result.period.endDay
    )} · medians with ${result.percentileBand.label}`,
    '',
    `Sleep: ${sleepParts.length > 0 ? sleepParts.join(' | ') : 'n/a'}`,
    `Readiness: ${readinessParts.length > 0 ? readinessParts.join(' | ') : 'n/a'}`,
    contextParts.length > 0 ? contextParts.join(' | ') : 'Context: n/a',
    '',
    `Data: ${result.dataCoverage.sleepDays}/${result.dataCoverage.totalDays} sleep days · ${result.dataCoverage.activityDays}/${result.dataCoverage.totalDays} activity days`,
  ].join('\n');
}
