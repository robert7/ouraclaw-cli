import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_BASELINE_CONFIG,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_THRESHOLDS,
  SCHEMA_VERSION,
  getLegacyConfigFilePath,
  getStateDir,
  getStateFilePath,
} from './config';
import { BaselineConfig, LegacyOuraConfig, OuraCliState } from './types';

export function defaultState(): OuraCliState {
  return {
    schemaVersion: SCHEMA_VERSION,
    auth: {},
    thresholds: {
      sleepScoreMin: DEFAULT_THRESHOLDS.sleepScoreMin,
      readinessScoreMin: DEFAULT_THRESHOLDS.readinessScoreMin,
      temperatureDeviationMax: DEFAULT_THRESHOLDS.temperatureDeviationMax,
    },
    baselineConfig: {
      lowerPercentile: DEFAULT_BASELINE_CONFIG.lowerPercentile,
      supportingMetricAlertCount: DEFAULT_BASELINE_CONFIG.supportingMetricAlertCount,
    },
    schedule: {
      enabled: DEFAULT_SCHEDULE_CONFIG.enabled,
      timezone: DEFAULT_SCHEDULE_CONFIG.timezone,
      deliveryLanguage: DEFAULT_SCHEDULE_CONFIG.deliveryLanguage,
      morningEnabled: DEFAULT_SCHEDULE_CONFIG.morningEnabled,
      morningTime: DEFAULT_SCHEDULE_CONFIG.morningTime,
      eveningEnabled: DEFAULT_SCHEDULE_CONFIG.eveningEnabled,
      eveningTime: DEFAULT_SCHEDULE_CONFIG.eveningTime,
      optimizedWatcherEnabled: DEFAULT_SCHEDULE_CONFIG.optimizedWatcherEnabled,
      optimizedWatcherDeliveryMode: DEFAULT_SCHEDULE_CONFIG.optimizedWatcherDeliveryMode,
      optimizedWatcherStart: DEFAULT_SCHEDULE_CONFIG.optimizedWatcherStart,
      optimizedWatcherEnd: DEFAULT_SCHEDULE_CONFIG.optimizedWatcherEnd,
      optimizedWatcherIntervalMinutes: DEFAULT_SCHEDULE_CONFIG.optimizedWatcherIntervalMinutes,
    },
    deliveries: {},
  };
}

function normalizeBaselineConfig(input: unknown, base: BaselineConfig): BaselineConfig {
  const candidate = input as Partial<BaselineConfig> | null | undefined;
  return {
    lowerPercentile:
      typeof candidate?.lowerPercentile === 'number'
        ? candidate.lowerPercentile
        : base.lowerPercentile,
    supportingMetricAlertCount:
      typeof candidate?.supportingMetricAlertCount === 'number'
        ? candidate.supportingMetricAlertCount
        : base.supportingMetricAlertCount,
  };
}

export function ensurePrivateStateDir(): void {
  const dir = getStateDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Best effort on platforms that ignore chmod.
  }
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function normalizeState(input: Partial<OuraCliState> | null): OuraCliState {
  const base = defaultState();
  if (!input) {
    return base;
  }

  const morningOptimizedDelivery = input.deliveries?.morningOptimized;
  const normalizedMorningOptimizedDelivery =
    morningOptimizedDelivery?.lastDeliveredDay &&
    morningOptimizedDelivery.lastDeliveredAt &&
    morningOptimizedDelivery.lastDeliveryKey
      ? {
          lastDeliveredDay: morningOptimizedDelivery.lastDeliveredDay,
          lastDeliveredAt: morningOptimizedDelivery.lastDeliveredAt,
          lastDeliveryKey: morningOptimizedDelivery.lastDeliveryKey,
        }
      : undefined;
  const normalizedOptimizedWatcherCronJobIds = Array.isArray(
    input.schedule?.optimizedWatcherCronJobIds
  )
    ? input.schedule?.optimizedWatcherCronJobIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    : undefined;

  return {
    schemaVersion: SCHEMA_VERSION,
    auth: { ...base.auth, ...(input.auth ?? {}) },
    thresholds: { ...base.thresholds, ...(input.thresholds ?? {}) },
    baselineConfig: normalizeBaselineConfig(input.baselineConfig, base.baselineConfig),
    schedule: {
      ...base.schedule,
      ...(input.schedule ?? {}),
      ...(normalizedOptimizedWatcherCronJobIds
        ? { optimizedWatcherCronJobIds: normalizedOptimizedWatcherCronJobIds }
        : {}),
    },
    baseline: input.baseline ?? base.baseline,
    deliveries: {
      ...base.deliveries,
      ...(input.deliveries ?? {}),
      ...(normalizedMorningOptimizedDelivery
        ? { morningOptimized: normalizedMorningOptimizedDelivery }
        : {}),
    },
  };
}

function migrateLegacyConfig(): OuraCliState | null {
  const legacyPath = getLegacyConfigFilePath();
  const legacy = safeReadJson<LegacyOuraConfig>(legacyPath);
  if (!legacy) {
    return null;
  }

  const migrated = defaultState();
  migrated.auth = {
    clientId: legacy.clientId,
    clientSecret: legacy.clientSecret,
    accessToken: legacy.accessToken,
    refreshToken: legacy.refreshToken,
    tokenExpiresAt: legacy.tokenExpiresAt,
  };

  return migrated;
}

export function writeState(state: OuraCliState): void {
  ensurePrivateStateDir();
  const filePath = getStateFilePath();
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Best effort on platforms that ignore chmod.
  }
}

export function readState(): OuraCliState {
  const filePath = getStateFilePath();
  const current = safeReadJson<OuraCliState>(filePath);
  if (current) {
    return normalizeState(current);
  }

  const migrated = migrateLegacyConfig();
  if (migrated) {
    writeState(migrated);
    return migrated;
  }

  return defaultState();
}

export function updateState(patch: Partial<OuraCliState>): OuraCliState {
  const current = readState();
  const next: OuraCliState = {
    ...current,
    ...patch,
    auth: patch.auth ? { ...current.auth, ...patch.auth } : current.auth,
    thresholds: patch.thresholds
      ? { ...current.thresholds, ...patch.thresholds }
      : current.thresholds,
    baselineConfig: patch.baselineConfig
      ? { ...current.baselineConfig, ...patch.baselineConfig }
      : current.baselineConfig,
    schedule: patch.schedule
      ? {
          ...current.schedule,
          ...patch.schedule,
          optimizedWatcherCronJobIds:
            patch.schedule.optimizedWatcherCronJobIds === undefined
              ? current.schedule.optimizedWatcherCronJobIds
              : patch.schedule.optimizedWatcherCronJobIds.filter(
                  (id): id is string => typeof id === 'string' && id.length > 0
                ),
        }
      : current.schedule,
    baseline: patch.baseline === undefined ? current.baseline : patch.baseline,
    deliveries: patch.deliveries
      ? {
          ...current.deliveries,
          ...patch.deliveries,
          morningOptimized: patch.deliveries.morningOptimized
            ? {
                ...current.deliveries?.morningOptimized,
                ...patch.deliveries.morningOptimized,
              }
            : current.deliveries?.morningOptimized,
        }
      : current.deliveries,
  };

  writeState(next);
  return next;
}

export function stateExists(): boolean {
  return fs.existsSync(path.resolve(getStateFilePath()));
}
