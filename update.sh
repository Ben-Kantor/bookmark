#!/usr/bin/env bash
set -euo pipefail

# Colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
RESET="\033[0m"

# Variables
TMP_CONTENT="./tmp_content_update_$$"
MERGE_CONFLICTS=()

# Functions
info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }

cleanup() {
    if [[ -d "$TMP_CONTENT" ]]; then
        # Restore only untracked content
        rsync -a "$TMP_CONTENT/" ./ || true
        rm -rf "$TMP_CONTENT"
        success "Local content restored during cleanup."
    fi
}
trap cleanup EXIT

# Git Setup
if [[ ! -d .git ]]; then
    info "Initializing git repository..."
    git init
fi

if ! git remote get-url origin &>/dev/null; then
    info "Setting git remote..."
    git remote add origin https://github.com/Ben-Kantor/bookmark
fi

# Record starting states
START_COMMIT=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "none")
START_DENO=$(deno --version | head -n1 | awk '{print $2}')

# Preserve local untracked content
info "Preserving untracked local content..."
mkdir -p "$TMP_CONTENT"
git ls-files --others --exclude-standard -z | xargs -0 -I{} rsync -a {} "$TMP_CONTENT/" || true

# Stash tracked changes quietly
info "Stashing tracked changes..."
git stash push --include-untracked &>/dev/null || true

# Pull latest changes
info "Pulling latest changes..."
if ! git pull --rebase; then
    warn "Merge conflicts detected!"
    MERGE_CONFLICTS=($(git diff --name-only --diff-filter=U))
fi

# Restore stashed tracked changes
info "Restoring stashed changes..."
git stash pop &>/dev/null || true

# Update Deno
info "Updating Deno..."
deno update &>/dev/null || warn "Deno update failed."
deno upgrade &>/dev/null || warn "Deno upgrade failed."
END_DENO=$(deno --version | head -n1 | awk '{print $2}')

# Record ending commit
END_COMMIT=$(git rev-parse --short=7 HEAD)

# List new commits in chronological order
if [[ "$START_COMMIT" != "none" && "$START_COMMIT" != "$END_COMMIT" ]]; then
    NEW_COMMITS=$(git log --oneline --abbrev-commit --abbrev=7 --reverse ${START_COMMIT}..${END_COMMIT})
else
    NEW_COMMITS="  none"
fi

# Display update summary
echo
echo -e "${BLUE}================== UPDATE SUMMARY ==================${RESET}"

# Commit info
if [[ "$START_COMMIT" == "$END_COMMIT" ]]; then
    echo -e "Server commit: ${YELLOW}stayed at $END_COMMIT${RESET}"
else
    echo -e "Server commit: ${START_COMMIT} -> ${GREEN}$END_COMMIT${RESET}"
fi

# Deno info
if [[ "$START_DENO" == "$END_DENO" ]]; then
    echo -e "Deno version: ${YELLOW}stayed at $END_DENO${RESET}"
else
    echo -e "Deno version: ${START_DENO} -> ${GREEN}$END_DENO${RESET}"
fi

# New commits
echo
echo -e "${CYAN}New commits:${RESET}"
echo "$NEW_COMMITS"

# Merge conflicts
echo
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

# Restore untracked local content
if [[ -d "$TMP_CONTENT" ]]; then
    rsync -a "$TMP_CONTENT/" ./ || true
    rm -rf "$TMP_CONTENT"
    success "Local content restored."
fi
