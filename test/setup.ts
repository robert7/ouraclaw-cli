import { afterEach } from 'vitest';

afterEach(() => {
  delete process.env.OURA_CLI_P_HOME;
  delete process.env.OURA_CLI_P_LEGACY_CONFIG_FILE;
});
