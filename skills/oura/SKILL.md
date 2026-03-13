---
name: oura
description: Oura Ring sleep, readiness, activity, stress, and automated recap access through `oura-cli-p`.
homepage: https://github.com/robert7/oura-cli-p
metadata:
  {
    "openclaw":
      {
        "emoji": "🫧",
        "requires": { "bins": ["oura-cli-p"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "oura-cli-p",
              "bins": ["oura-cli-p"],
              "label": "Install oura-cli-p (npm)",
            },
          ],
      },
  }
---

# Oura via oura-cli-p

Use this skill when the user wants Oura Ring data, a morning recap, an evening recap, or an optimized morning alerting
decision.

## Preconditions

1. `oura-cli-p` is installed on the same machine as OpenClaw.
2. `oura-cli-p setup` has already completed successfully.
3. If setup has not completed, stop and ask the user to run `oura-cli-p setup`.

## Command Invocation Rule

- Run exactly one `oura-cli-p` command per execution.
- Invoke `oura-cli-p` directly.
- Do not chain commands with `&&`, `|`, `;`, subshells, or command substitution.
- Prefer the exact command forms documented below so OpenClaw allowlisting stays simple.

## Output Rule

- JSON is the default output for all commands.
- Use JSON when the command result needs machine reasoning or a send/no-send decision.
- Use `--text` only when you need a ready-to-send recap string.

## Common Commands

- Health check: `oura-cli-p auth status`
- Raw endpoint fetch:
  - `oura-cli-p fetch daily_sleep`
  - `oura-cli-p fetch sleep --start-date 2026-03-12 --end-date 2026-03-13`
- Manual baseline rebuild: `oura-cli-p baseline rebuild`
- Morning recap text: `oura-cli-p summary morning --text`
- Evening recap text: `oura-cli-p summary evening --text`
- Morning optimized decision: `oura-cli-p summary morning-optimized`

## Date Rules

- `fetch` defaults to today's date when no date flags are provided.
- If you need today's detailed sleep period, fetch `sleep` over yesterday -> today and then use the record whose `day`
  equals today, preferring `type="long_sleep"` if multiple records are returned.

## Morning Summary Template

When asked for the normal morning recap, run:

`oura-cli-p summary morning --text`

Send the returned text as-is. Do not fall back to yesterday's data. If the returned recap mentions missing or pending
fields, keep that wording instead of inventing substitutes.

## Evening Summary Template

When asked for the normal evening recap, run:

`oura-cli-p summary evening --text`

Send the returned text as-is. Do not fall back to yesterday's data.

## Morning Optimized Template

When asked whether a morning alert should be sent, run:

`oura-cli-p summary morning-optimized`

Interpret the JSON contract directly:

- If `dataReady` is `false`, do not send a message.
- If `ordinary` is `true`, do not send a message.
- If `shouldSend` is `true` and `message` is present, send the `message` exactly.
- If `baselineStatus` is `"refresh_failed"`, trust the CLI result anyway; it already fell back to fixed thresholds.

## Ad-hoc Query Mapping

- "How did I sleep?" -> `oura-cli-p fetch daily_sleep`
- "Show detailed sleep" -> `oura-cli-p fetch sleep --start-date <yesterday> --end-date <today>`
- "What's my readiness?" -> `oura-cli-p fetch daily_readiness`
- "How active was I today?" -> `oura-cli-p fetch daily_activity`
- "How stressed was I?" -> `oura-cli-p fetch daily_stress`

Do not recreate Oura business logic in prompt text when the CLI already exposes it.
