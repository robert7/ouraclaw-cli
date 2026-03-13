# Migrating from the Old OpenClaw Plugin

If you previously used the old `ouraclaw` OpenClaw plugin, uninstall it first:

```bash
openclaw plugins uninstall ouraclaw
```

Restart the OpenClaw gateway if prompted.

Then install the standalone CLI:

```bash
npm install -g @robertvii/ouraclaw-cli
```

After installation, run either:

```bash
ouraclaw-cli auth status
```

or:

```bash
ouraclaw-cli setup
```

On first read, `ouraclaw-cli` imports compatible auth fields from the legacy plugin config at
`~/.openclaw/plugins/ouraclaw/config.json` if it exists. The old file is left untouched.

In practice this means the OpenClaw uninstall removes the old plugin registration from OpenClaw itself, while the CLI
can still reuse compatible auth data from the legacy plugin config during migration.
