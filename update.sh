#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Colors
RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[0;33m"; BLUE="\033[0;34m"; CYAN="\033[0;36m"; RESET="\033[0m"
info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }

RESTORE_PATHS=( "content" )

[[ -d .git ]] || { info "Initializing git repository..."; git init; }
git remote get-url origin &>/dev/null || git remote add origin https://github.com/Ben-Kantor/bookmark

START_COMMIT=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "none")
START_DENO=$(command -v deno &>/dev/null && deno --version | head -n1 | awk '{print $2}' || echo "none")

info "Saving local state..."
git add -A
git commit -m "Temporary local snapshot before pull ($(date +%H:%M:%S))" --allow-empty
TMP_COMMIT=$(git rev-parse HEAD)
TMP_COMMIT_SHORT=$(git rev-parse --short=7 "$TMP_COMMIT")

info "Pulling latest changes..."
MERGE_CONFLICTS=()
if ! git pull --rebase; then
    warn "Merge conflicts detected!"
    mapfile -t MERGE_CONFLICTS < <(git diff --name-only --diff-filter=U)
fi

for p in "${RESTORE_PATHS[@]}"; do
    if git ls-tree -r --name-only "$TMP_COMMIT" | grep -q -F "${p%/}/"; then
        info "Restoring '$p' from local snapshot..."
        git checkout "$TMP_COMMIT" -- "$p" || warn "Restore failed for $p"
        git reset --mixed &>/dev/null || true
    fi
done

info "Cleaning up temporary commit..."
git reset --soft HEAD~1

info "Updating Deno..."
if command -v deno &>/dev/null; then
    deno update &>/dev/null || warn "deno update failed."
    deno upgrade &>/dev/null || warn "deno upgrade failed."
fi

END_COMMIT=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "none")
END_DENO=$(command -v deno &>/dev/null && deno --version | head -n1 | awk '{print $2}' || echo "none")

[[ "$START_COMMIT" != "$END_COMMIT" && "$START_COMMIT" != "none" ]] \
    && NEW_COMMITS=$(git log --oneline --abbrev-commit --reverse ${START_COMMIT}..${END_COMMIT}) \
    || NEW_COMMITS="  none"

echo
echo -e "${BLUE}================== UPDATE SUMMARY ==================${RESET}"
[[ "$START_COMMIT" == "$END_COMMIT" ]] && echo -e "Server commit: ${YELLOW}stayed at $END_COMMIT${RESET}" \
    || echo -e "Server commit: ${START_COMMIT} -> ${GREEN}$END_COMMIT${RESET}"
[[ "$START_DENO" == "$END_DENO" ]] && echo -e "Deno version: ${YELLOW}stayed at $END_DENO${RESET}" \
    || echo -e "Deno version: ${START_DENO} -> ${GREEN}$END_DENO${RESET}"
echo -e "\n${CYAN}New commits:${RESET}\n$NEW_COMMITS\n"

if [[ ${#MERGE_CONFLICTS[@]} -eq 0 ]]; then
    echo -e "Merge conflicts: ${GREEN}none${RESET}"
else
    echo -e "Merge conflicts detected in files:"
    for f in "${MERGE_CONFLICTS[@]}"; do
        echo -e "  - ${RED}$f${RESET}"
        git diff -- "$f" | grep -n '<<<<<<<\|=======' || true
    done
fi
echo -e "${BLUE}====================================================${RESET}"
