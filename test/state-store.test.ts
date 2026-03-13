import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { readState, updateState, writeState } from '../src/state-store';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oura-cli-p-state-'));
}

describe('state-store', () => {
  test('returns defaults when no state exists', () => {
    process.env.OURA_CLI_P_HOME = makeTempDir();

    const state = readState();

    expect(state.schemaVersion).toBe(1);
    expect(state.thresholds.sleepScoreMin).toBe(75);
    expect(state.auth.accessToken).toBeUndefined();
  });

  test('migrates legacy auth config on first read', () => {
    const home = makeTempDir();
    process.env.OURA_CLI_P_HOME = path.join(home, 'new-home');
    process.env.OURA_CLI_P_LEGACY_CONFIG_FILE = path.join(home, 'legacy.json');
    fs.writeFileSync(
      process.env.OURA_CLI_P_LEGACY_CONFIG_FILE,
      JSON.stringify({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenExpiresAt: 123,
      })
    );

    const state = readState();

    expect(state.auth.clientId).toBe('client-id');
    expect(state.auth.refreshToken).toBe('refresh');
    expect(fs.existsSync(path.join(process.env.OURA_CLI_P_HOME, 'oura-cli-p.json'))).toBe(true);
  });

  test('writes private state and merges updates', () => {
    const home = makeTempDir();
    process.env.OURA_CLI_P_HOME = home;
    writeState({
      schemaVersion: 1,
      auth: {},
      thresholds: {
        sleepScoreMin: 75,
        readinessScoreMin: 75,
        temperatureDeviationMax: 0.1,
      },
    });

    const next = updateState({
      auth: { accessToken: 'fresh-token' },
      thresholds: { readinessScoreMin: 72 },
    });

    expect(next.auth.accessToken).toBe('fresh-token');
    expect(next.thresholds.sleepScoreMin).toBe(75);
    expect(next.thresholds.readinessScoreMin).toBe(72);

    const stateFile = path.join(home, 'oura-cli-p.json');
    const dirMode = fs.statSync(home).mode & 0o777;
    const fileMode = fs.statSync(stateFile).mode & 0o777;

    expect(dirMode).toBe(0o700);
    expect(fileMode).toBe(0o600);
  });
});
