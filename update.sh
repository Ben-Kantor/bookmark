#!/usr/bin/env bash
set -euo pipefail

# Colors
RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[0;33m"; BLUE="\033[0;34m"; CYAN="\033[0;36m"; RESET="\033[0m"

# Variables
TMP_CONTENT="./tmp_content_update_$$"
MERGE_CONFLICTS=()

# Logging
info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }

cleanup() {
    [[ -d "$TMP_CONTENT" ]] && rm -rf "$TMP_CONTENT"
}
trap cleanup EXIT

# Git Setup
[[ -d .git ]] || { info "Initializing git repository..."; git init; }
git remote get-url origin &>/dev/null || git remote add origin https://github.com/Ben-Kantor/bookmark

# Record starting state
START_COMMIT=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "none")
START_DENO=$(deno --version | head -n1 | awk '{print $2}')

# Preserve untracked content (with paths)
info "Preserving untracked local content..."
mkdir -p "$TMP_CONTENT"
git ls-files --others --exclude-standard -z \
  | rsync -a --files-from=- ./ "$TMP_CONTENT" || true

# Stash tracked changes
info "Stashing tracked changes..."
git stash push --include-untracked &>/dev/null || true

# Pull latest changes
info "Pulling latest changes..."
if ! git pull --rebase; then
    warn "Merge conflicts detected!"
    mapfile -t MERGE_CONFLICTS < <(git diff --name-only --diff-filter=U)
fi

# Restore stashed changes
info "Restoring stashed changes..."
git stash pop &>/dev/null || true

# Restore untracked files to original locations
if [[ -d "$TMP_CONTENT" ]]; then
    rsync -a "$TMP_CONTENT/" ./ || true
    success "Local untracked content restored to original paths."
fi

# Update Deno
info "Updating Deno..."
deno update &>/dev/null || warn "Deno update failed."
deno upgrade &>/dev/null || warn "Deno upgrade failed."
END_DENO=$(deno --version | head -n1 | awk '{print $2}')

# Record ending commit
END_COMMIT=$(git rev-parse --short=7 HEAD)

# List new commits
if [[ "$START_COMMIT" != "none" && "$START_COMMIT" != "$END_COMMIT" ]]; then
    NEW_COMMITS=$(git log --oneline --abbrev-commit --reverse ${START_COMMIT}..${END_COMMIT})
else
    NEW_COMMITS="  none"
fi

# Display summary
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
