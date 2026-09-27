@AGENTS.md

## Claude Code

- `.claude/settings.json` runs `scripts/repo-status.sh` as hooks. At session start it reports
  lingering state. On Stop it blocks once when anything lingers, so finish the definition of done or
  explain why you can't. A second stop in the same turn always proceeds.
- Use `/code-review` for the review step before `scripts/ship.sh`.
