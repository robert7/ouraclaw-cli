import { describe, expect, test } from 'vitest';

import { createProgram } from '../src/cli';

describe('cli', () => {
  test('registers the expected top-level commands', () => {
    const commandNames = createProgram()
      .commands.map((command) => command.name())
      .sort();

    expect(commandNames).toEqual(['auth', 'baseline', 'config', 'fetch', 'setup', 'summary']);
  });
});
