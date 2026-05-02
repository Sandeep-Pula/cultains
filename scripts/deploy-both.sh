#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_DIR="${ADMIN_DIR:-${ROOT_DIR}/.admin-pulalabs}"
ADMIN_REMOTE="${ADMIN_REMOTE:-https://github.com/Sandeep-Pula/Admin-Pulalabs.git}"
BRANCH="${BRANCH:-main}"
COMMIT_MESSAGE="${1:-Update PULA sites}"

cd "${ROOT_DIR}"

echo "Building regular site..."
npm run build

echo "Committing regular site changes..."
git add -A
if git diff --cached --quiet; then
  echo "No regular site changes to commit."
else
  git commit -m "${COMMIT_MESSAGE}"
fi

echo "Pushing regular site..."
git push origin "${BRANCH}"

if [ ! -d "${ADMIN_DIR}/.git" ]; then
  echo "Creating admin repo checkout at ${ADMIN_DIR}..."
  git clone "${ADMIN_REMOTE}" "${ADMIN_DIR}"
fi

echo "Updating admin repo checkout..."
git -C "${ADMIN_DIR}" fetch origin "${BRANCH}"
git -C "${ADMIN_DIR}" checkout "${BRANCH}"
git -C "${ADMIN_DIR}" pull --ff-only origin "${BRANCH}"

echo "Syncing source files into admin repo..."
rsync -a --delete \
  --exclude='.git/' \
  --exclude='.admin-pulalabs/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='dist-ssr/' \
  --exclude='outputs/' \
  --exclude='tmp/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.tsbuildinfo' \
  "${ROOT_DIR}/" "${ADMIN_DIR}/"

mkdir -p "${ADMIN_DIR}/public" "${ADMIN_DIR}/.github/workflows"
printf 'admin.pulalabs.com\n' > "${ADMIN_DIR}/public/CNAME"
cp "${ROOT_DIR}/scripts/admin-ci.yml" "${ADMIN_DIR}/.github/workflows/ci.yml"

echo "Building admin site..."
(
  cd "${ADMIN_DIR}"
  VITE_ADMIN_PORTAL=true npm run build
)

echo "Committing admin site changes..."
git -C "${ADMIN_DIR}" add -A
if git -C "${ADMIN_DIR}" diff --cached --quiet; then
  echo "No admin site changes to commit."
else
  git -C "${ADMIN_DIR}" commit -m "${COMMIT_MESSAGE}"
fi

echo "Pushing admin site..."
git -C "${ADMIN_DIR}" push origin "${BRANCH}"

echo "Done. Regular and admin repos are both up to date."
