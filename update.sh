#!/usr/bin/env bash
set -euo pipefail

# Temp directory for preserving content
TMP_CONTENT="./tmp_content_update_$$"

# Cleanup on exit (ensures content restored if things fail)
cleanup() {
  if [[ -d "$TMP_CONTENT" ]]; then
    # If content didn't exist originally, don't restore it
    if [[ -d "./content" ]]; then
      rm -rf ./content
    fi
    mv "$TMP_CONTENT" ./content
  fi
}
trap cleanup EXIT

# Preserve content if it exists
if [[ -d ./content ]]; then
  mv ./content "$TMP_CONTENT"
fi

# Update repository
git stash push --include-untracked || true
git pull --rebase
git stash pop || true

# Restore content logic
if [[ -d "$TMP_CONTENT" ]]; then
  rm -rf ./content
  mv "$TMP_CONTENT" ./content
else
  # Ensure no ./content dir if none existed before
  rm -rf ./content
fi

# Update Deno
deno update
deno upgrade
