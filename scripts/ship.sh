#!/usr/bin/env bash
# Deliver finished work (see AGENTS.md): run tests, commit everything on a branch, push, open a
# pull request with its review notes, wait for every CI check, merge, and return to a clean main.
#
#   scripts/ship.sh COMMIT_MESSAGE_FILE PR_BODY_FILE
#
# The first line of the commit message is the PR title. The PR body must contain a "## Review"
# section describing how the diff was reviewed and what was verified.
set -euo pipefail

die() {
	echo "ship: $*" >&2
	exit 1
}
[[ $# -eq 2 ]] || die "usage: scripts/ship.sh COMMIT_MESSAGE_FILE PR_BODY_FILE"
message=$(realpath "$1")
body=$(realpath "$2")
[[ -s $message ]] || die "commit message file is missing or empty: $1"
[[ -s $body ]] || die "PR body file is missing or empty: $2"
grep -q '^## Review' "$body" || die "the PR body needs a '## Review' section describing the review"

cd "$(git -C "$(dirname "$(realpath "$0")")" rev-parse --show-toplevel)"
gh auth status >/dev/null 2>&1 || die "gh is not authenticated"
main=main
subject=$(head -n 1 "$message")
branch=$(git branch --show-current)
[[ -n $branch ]] || die "detached HEAD; check out a branch first"

git fetch --prune --quiet origin
unpushed=$(git rev-list --count "origin/$main..$main")
if [[ -z $(git status --porcelain) && $branch == "$main" && $unpushed == 0 ]]; then
	echo "ship: nothing to deliver"
	exec scripts/repo-status.sh
fi

log=$(mktemp)
trap 'rm -f "$log"' EXIT
for check in lint test; do
	echo "ship: running npm run $check"
	if ! npm run "$check" >"$log" 2>&1; then
		tail -n 40 "$log"
		die "npm run $check failed; nothing was committed (npm run format fixes formatting)"
	fi
done

if [[ $branch == "$main" ]]; then
	slug=$(tr '[:upper:]' '[:lower:]' <<<"$subject" | tr -cs 'a-z0-9' '-' | cut -c1-40 | sed 's/^-*//; s/-*$//')
	branch="work/$(date +%Y%m%d-%H%M%S)-${slug:-change}"
	git switch --quiet -c "$branch"
	# Commits made directly on main travel with the new branch; main returns to origin.
	git branch --force "$main" "origin/$main"
fi

git add --all
git diff --cached --quiet || git commit --quiet --file "$message"
[[ $(git rev-list --count "origin/$main..HEAD") -gt 0 ]] || die "no commits to deliver"
git push --quiet --set-upstream origin "$branch"

pr=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number // empty')
if [[ -z $pr ]]; then
	url=$(gh pr create --base "$main" --head "$branch" --title "$subject" --body-file "$body")
	pr=${url##*/}
else
	gh pr edit "$pr" --body-file "$body" >/dev/null
fi
echo "ship: pull request #$pr; waiting for CI"

# The required check aggregates other jobs, so it only appears once they finish. Poll
# until it passes, stopping early when any check fails or is cancelled.
required=${SHIP_REQUIRED_CHECK:-verify}
failed="CI failed on #$pr. Fix it and run scripts/ship.sh again, or close it: gh pr close $pr --delete-branch --comment '<reason>'"
check_state() {
	gh pr checks "$pr" --json name,bucket --jq ".[] | select(.name == \"$required\") | .bucket" 2>/dev/null
}
failures() {
	gh pr checks "$pr" --json bucket --jq '[.[] | select(.bucket == "fail" or .bucket == "cancel")] | length' 2>/dev/null || echo 0
}
deadline=$((SECONDS + ${SHIP_CI_TIMEOUT:-3600}))
until [[ $(check_state) == pass ]]; do
	[[ $(failures) -eq 0 ]] || die "$failed"
	((SECONDS < deadline)) || die "the '$required' check did not pass on #$pr in time; inspect CI, then rerun"
	sleep 30
done

gh pr merge "$pr" --merge --delete-branch ||
	die "merging #$pr failed (conflicts?). Update the branch from $main, rerun, or close the PR"
git switch --quiet "$main"
git pull --quiet --ff-only origin "$main"
git fetch --prune --quiet origin
git branch --delete --force "$branch" 2>/dev/null || true
echo "ship: merged #$pr"
# Other open work is reported, but does not make this delivery a failure.
scripts/repo-status.sh || echo "ship: #$pr is merged; finish the open items above as well."
