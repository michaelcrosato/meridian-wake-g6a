#!/usr/bin/env bash
# Report anything that keeps the repository from being clean: uncommitted or unpushed work,
# extra branches, worktrees or stashes, and open GitHub pull requests. See AGENTS.md.
#
#   scripts/repo-status.sh            human-readable report; exits 1 when something lingers
#   scripts/repo-status.sh --hook     Claude Code Stop hook: blocks the stop once with the report
#   scripts/repo-status.sh --session  Claude Code SessionStart hook: reports lingering state as context
set -uo pipefail

mode=${1:-}
if [[ $mode == --hook ]]; then
	input=$(cat)
	# A second stop in the same turn always proceeds, so this hook can never loop.
	if [[ $(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null) == true ]]; then
		exit 0
	fi
fi

# Hooks may run from any directory; the repository is the one containing this script.
root=$(git -C "$(dirname "$(realpath "$0")")" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
main=main
issues=()
warnings=()

timeout 20 git fetch --prune --quiet origin 2>/dev/null ||
	warnings+=("could not fetch origin; remote branch state may be stale")

changes=$(git status --porcelain | wc -l)
((changes)) && issues+=("$changes uncommitted change(s) in the working tree")

branch=$(git branch --show-current)
[[ $branch != "$main" ]] && issues+=("checked out on '${branch:-detached HEAD}' instead of $main")

ahead=$(git rev-list --count "origin/$main..$main" 2>/dev/null || echo 0)
behind=$(git rev-list --count "$main..origin/$main" 2>/dev/null || echo 0)
((ahead)) && issues+=("$main has $ahead unpushed commit(s); deliver them through a pull request")
((behind)) && issues+=("$main is $behind commit(s) behind origin/$main; run: git pull --ff-only")

local_branches=$(git for-each-ref --format='%(refname:short)' refs/heads | grep -vx "$main" | paste -sd' ' -)
[[ -n $local_branches ]] && issues+=("local branches besides $main: $local_branches")

remote_branches=$(git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/origin |
	grep -vxE "$main|HEAD" | paste -sd' ' -)
[[ -n $remote_branches ]] && issues+=("remote branches besides $main: $remote_branches")

worktrees=$(($(git worktree list | wc -l) - 1))
((worktrees > 0)) && issues+=("$worktrees extra worktree(s): $(git worktree list | tail -n +2 | awk '{print $1}' | paste -sd' ' -)")

stashes=$(git stash list | wc -l)
((stashes)) && issues+=("$stashes stashed change set(s); apply and deliver them or drop them")

if prs=$(timeout 20 gh pr list --state open --json number,title,headRefName \
	--jq '.[] | "#\(.number) \(.headRefName): \(.title)"' 2>/dev/null); then
	[[ -n $prs ]] && issues+=("open pull requests (review, then merge or close): $(paste -sd';' - <<<"$prs")")
else
	warnings+=("could not list GitHub pull requests")
fi

report() {
	local item
	for item in "${issues[@]}"; do printf -- '- %s\n' "$item"; done
	for item in "${warnings[@]}"; do printf -- '- warning: %s\n' "$item"; done
}

case $mode in
--hook)
	((${#issues[@]})) || exit 0
	reason=$(
		printf 'The repository is not clean:\n'
		report
		printf '\nFollow the AGENTS.md definition of done. If the work is finished and tests are green, review the diff and deliver it with scripts/ship.sh (PR, CI, merge, cleanup); review and merge or close every open pull request. If tests fail or the user must decide something, say so explicitly in your reply instead.'
	)
	jq -n --arg reason "$reason" '{decision: "block", reason: $reason}'
	;;
--session)
	((${#issues[@]})) || exit 0
	printf 'Lingering repository state (resolve it per AGENTS.md before starting new work):\n'
	report
	;;
*)
	if ((${#issues[@]})); then
		report
		exit 1
	fi
	echo "Repository clean: $main matches origin, no open pull requests, branches, worktrees or stashes."
	((${#warnings[@]})) && report
	exit 0
	;;
esac
