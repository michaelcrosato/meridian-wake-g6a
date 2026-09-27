# AGENTS.md — Meridian Wake

Repository rules for every coding agent (Claude Code, Codex, Gemini, opencode, …). They extend the
workstation-wide `~/AGENTS.md`. Project overview, commands and budgets: [README](README.md) and
[development](docs/development.md).

## Definition of done: every prompt or goal ends merged and clean

When the requested work is finished and tests are green, deliver it in the same session. Don't stop
with work sitting in the tree, on a branch, or in an open pull request.

1. **Verify.** `npm test` always. Also run `npm run test:e2e` and `npm run check:size` when the UI,
   rendering, build, data or assets changed. CI runs the full suite again before merging.
2. **Review the diff.** In Claude Code, run `/code-review`; otherwise read `git diff` critically.
   Fix what you find, and summarize the review and verification under `## Review` in the PR body.
3. **Ship.** Run `scripts/ship.sh COMMIT_MESSAGE_FILE PR_BODY_FILE`. It runs the tests, moves the
   work off `main` onto a `work/…` branch, commits everything, pushes, and opens the pull request.
   It then waits for every CI check, merges with a merge commit, deletes the branch, and returns to
   an up-to-date `main`. Keep message and body files outside the repository (e.g. a temp or
   scratch directory).
4. **Confirm clean.** `scripts/repo-status.sh` must report the repository clean.

If CI fails, fix the problem and run `scripts/ship.sh` again. If the change shouldn't land, close the
pull request with a reason (`gh pr close N --delete-branch --comment "…"`). Changes reach `main` only
through pull requests; nothing is pushed to `main` directly.

If tests fail or the user must decide something, stop and say so explicitly. Never ship red work.

## Never leave lingering state

A clean repository means `scripts/repo-status.sh` reports nothing:

- no uncommitted changes, stashes or unpushed commits;
- `main` checked out and equal to `origin/main`;
- no other local or remote branches, and no extra worktrees;
- no open pull requests.

At the start of a session, run `scripts/repo-status.sh`. Review every open pull request you find:
merge it when its checks are green and the change is correct, otherwise close it with a comment.
Treat leftover branches and worktrees the same way: merge them through a PR, or delete them after
confirming their work is already on `main` or unwanted.

Scratch output goes in the ignored `artifacts/`, `.cache/` or `test-results/`, never in tracked
paths. Parallel worktrees are fine during a task but must be merged or removed before it ends.

## Commands

```sh
npm test               # unit tests (node --test)
npm run test:e2e       # production build + Playwright journeys
npm run check:size     # size budgets (after a build)
npm run verify:source  # source/audio provenance (needs ffprobe)
scripts/repo-status.sh # anything lingering?
scripts/ship.sh MSG BODY
```
