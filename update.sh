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

# Prevent running as root
# if [[ $EUID -eq 0 ]]; then
#     error "This script should NOT be run as root. Exiting."
#     exit 1
#fi

handle_error() {
    local exit_code=$?
    case $exit_code in
        128)
            error "Git repository not properly initialized or remote missing."
            ;;
        1)
            error "An error occurred during git pull or stash. Check repository state."
            ;;
        127)
            error "Command not found. Is Deno installed and in PATH?"
            ;;
        *)
            error "Script exited with code $exit_code."
            ;;
    esac
    exit $exit_code
}
trap 'handle_error' ERR

cleanup() {
    if [[ -d "$TMP_CONTENT" ]]; then
        rm -rf ./content || true
        mv "$TMP_CONTENT" ./content
        success "Content restored during cleanup."
    fi
}
trap cleanup EXIT

# Preserve Content
if [[ -d ./content ]]; then
    info "Preserving existing content..."
    mv ./content "$TMP_CONTENT"
fi

# Git Setup
if [[ ! -d .git ]]; then
    info "Initializing git repository..."
    git init
fi

if ! git remote get-url origin &>/dev/null; then
    info "Setting git remote..."
    git remote add origin https://github.com/Ben-Kantor/bookmark
fi

# Record Starting States
START_COMMIT=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "none")
START_DENO=$(deno --version | head -n1 | awk '{print $2}')

# Stash Changes Quietly
info "Stashing local changes..."
git stash push --include-untracked &>/dev/null || true

# Pull Latest
info "Pulling latest changes..."
if ! git pull --rebase &>/dev/null; then
    warn "Merge conflicts detected!"
    MERGE_CONFLICTS=($(git diff --name-only --diff-filter=U))
fi

# Restore Stashed Changes
info "Restoring stashed changes..."
git stash pop &>/dev/null || true

# Restore Content
if [[ -d "$TMP_CONTENT" ]]; then
    rm -rf ./content || true
    mv "$TMP_CONTENT" ./content
    success "Content restored."
fi

# Update Deno
info "Updating Deno..."
deno update &>/dev/null || warn "Deno update failed."
deno upgrade &>/dev/null || warn "Deno upgrade failed."
END_DENO=$(deno --version | head -n1 | awk '{print $2}')

# Record Ending Commit
END_COMMIT=$(git rev-parse --short=7 HEAD)

# List New Commits
if [[ "$START_COMMIT" != "none" && "$START_COMMIT" != "$END_COMMIT" ]]; then
    NEW_COMMITS=$(git log --oneline --abbrev-commit --abbrev=7 ${START_COMMIT}..${END_COMMIT})
else
    NEW_COMMITS="  none"
fi

# Display Update Summary
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
        git diff "$f" | grep -n '<<<<<<<\|=======' || true
    done
fi

echo -e "${BLUE}====================================================${RESET}"
