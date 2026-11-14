#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo " [DREAMEX SOVEREIGN ENGINE v3.0] AUTONOMOUS VERIFICATION & DEPLOY"
echo "================================================================="

echo "[1/5] Static Type & Lint Analysis..."
npm run typecheck
npm run lint

echo "[2/5] Production Bundle Compilation & Prerender..."
npm run build

echo "[3/5] Running Build, SEO, Security & I18N Verifiers..."
npm run verify:build
npm run verify:i18n
npm run verify:security

echo "[4/5] Running Playwright E2E Architecture Gate..."
npx playwright test tests/e2e/architecture-gate.spec.ts

echo "[5/5] Pushing Verified Commit to GitHub..."
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "${1:-feat(platform): ship sovereign IT, QA, BA, PM & Jira workbench v3.0}"
fi
git push origin main

echo "✅ SHIP COMPLETE: https://www.dreamex.tech"
