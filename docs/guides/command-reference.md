# Command Reference

## Output Modes

- JSON is the default output for every command.
- `--text` is supported on `summary morning` and `summary evening`.
- `fetch` returns the raw Oura endpoint payload.

## Commands

### `oura-cli-p setup`

Interactive onboarding. Collects client credentials, runs OAuth, and stores initial threshold configuration.

### `oura-cli-p auth status`

Returns JSON describing whether auth is configured, whether the access token is expired, and whether refresh is
possible.

### `oura-cli-p auth refresh`

Uses the stored refresh token to fetch fresh tokens and rewrites local state.

### `oura-cli-p fetch <endpoint> [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]`

Fetches one Oura endpoint. Date handling rules:

- No dates: uses today for both start and end.
- One date: uses that same date for both start and end.
- Two dates: requires `start <= end`.

### `oura-cli-p baseline rebuild`

Rebuilds the baseline manually from the previous 21 days excluding today.

### `oura-cli-p baseline show`

Prints the stored baseline snapshot or `null` if none exists.

### `oura-cli-p config get [key]`

Prints all config/state fields or a specific key. Useful keys include:

- `thresholds.sleepScoreMin`
- `thresholds.readinessScoreMin`
- `thresholds.temperatureDeviationMax`

### `oura-cli-p config set <key> <value>`

Updates a supported config key. Numeric threshold values are validated before writing state.

### `oura-cli-p summary morning`

Builds the standard morning recap. Default output is JSON; `--text` prints the sendable message directly.

### `oura-cli-p summary morning-optimized`

Returns JSON for the optimized alerting flow. The result includes `dataReady`, `ordinary`, `shouldSend`, `message`,
`today`, optional `baseline`, and ordered `reasons`.

### `oura-cli-p summary evening`

Builds the standard evening recap. Default output is JSON; `--text` prints the sendable message directly.
