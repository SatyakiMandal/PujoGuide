# Contributing to PujoGuide

Welcome! To maintain code quality, reliable builds, and accurate data for PujoGuide during festival development, follow these core practices:

## 1. Branching & Commit Conventions
- **Feature Branches**: Use dedicated feature or tool branches (`feat/...`, `fix/...`) for non-trivial updates.
- **Commit Messages**: Write concise, imperative commit messages (`feat(planner): ...`, `fix(qrcode): ...`). Keep commits focused and atomic.

## 2. Data Integrity Rules
- **Source Files**: Raw research lives in `data/research/*.json` and manual pin overrides live in `data/overrides.json`.
- **Rebuilding Data**: Never manually edit `src/data/places.json` directly. Always run:
  ```bash
  npm run data
  ```
- **Sync Check**: Automated unit tests verify that `src/data/places.json` is perfectly in sync with the source data files.

## 3. Pre-Push Verification Checklist
Before committing or merging to `main`, run the full pre-flight verification script:
```bash
npm run check
```
This ensures:
1. `npm run typecheck` (TypeScript type correctness)
2. `npm test` (All 124+ Vitest unit tests pass)

## 4. End-to-End Testing & E2E Rules
- When editing map canvas components or layout, ensure that Playwright tests pass on all 7 viewports (`npm run test:e2e`).
- Always preserve `NEXT_DIST_DIR` and PWA fallback behavior.
