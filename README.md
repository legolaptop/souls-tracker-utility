# SOULS Tracker Utility

Minimal React + Vite + TypeScript foundation for a fully client-side SOULS tracker web app.

## Plan and Web App Design

### Purpose

This project helps guilds track SOULS Mimic event performance by extracting leaderboard data from user-provided screen recordings.

The app is designed to:

- Run fully client-side in the browser (no backend required for parsing).
- Parse roster and score videos locally.
- Match parsed names to a confirmed guild member roster.
- Export cleaned data for downstream analysis (CSV, JSON, XLSX).

### Core Product Workflow

The app enforces a strict sequence to improve data quality:

1. Roster setup first: upload guild-member scrolling video, parse names, confirm/correct roster.
2. Event setup second: define monthly event and its 3 active Mimics in rotation order.
3. Score processing third: upload score leaderboard video(s), parse by Mimic/day context.
4. Review and export: fix low-confidence rows as needed, then export at any time.

### Domain Model Summary

- One player belongs to one guild at a time.
- Events are modeled as 7-day windows.
- Each event has exactly 3 active Mimics chosen from global order:
	Purple -> Blue -> Red -> Green -> White -> Black.
- Individual member progress is the primary output, not in-app guild aggregate ranking.

### Parsing Architecture (MVP)

The MVP parser uses raw video processing, not stitched long-image reconstruction.

Pipeline:

1. Video intake and validation.
2. Section segmentation (for multi-Mimic videos).
3. Frame sampling in workers.
4. Region cropping (focus on rank/name/score, ignore combat-power subtext).
5. OCR extraction (raw text + confidence retained).
6. Candidate normalization (including score text normalization, e.g. 10K, 7,000K).
7. Roster matching (exact -> alias -> conservative fuzzy).
8. Cross-frame deduplication with source-frame provenance.
9. Review/correction and export.

Why this approach:

- More reliable than stitching for repetitive scrolling leaderboard rows.
- More memory-safe on mobile.
- Easier to review and debug due to frame provenance.

### Privacy and Hosting Model

- Hosting target: GitHub Pages (project page path `/souls-tracker-utility/`).
- Processing target: local browser execution only.
- User videos are not intended to be uploaded to external services.
- OCR/WASM dependencies may be loaded from CDN for MVP, while keeping parsing client-side.

### Parallel Development Strategy

After foundation contracts are stable, work can proceed in parallel:

- Agent A: app shell and UX pages.
- Agent B: parsing/domain/storage foundation.
- Agent C: video/OCR worker pipeline.
- Agent D: deployment, CI, quality tooling.

The foundation PR should establish shared contracts first (types, storage schema names, worker payloads, base-path conventions), then downstream agents consume those contracts.

### Reference Development Inputs

- Score sample video: scrolling Mimic leaderboard sections (Red/Green/White), parse rank/name/score and ignore combat power.
- Roster sample video: scrolling full guild member list used for required roster confirmation flow.

## Local Setup

### 1. Prerequisites

- Node.js `24.14.1` (see `.nvmrc`)
- npm `>= 11`

### 2. Install dependencies

```bash
npm install
```

### 3. Start development server

```bash
npm run dev
```

### 4. Validate local environment

```bash
npm run lint
npm run typecheck
npm run test
```

### 5. Build and preview

```bash
npm run build
npm run preview
```

## Deployment

This app is configured for GitHub Pages project-page deployment under `/souls-tracker-utility/`.
The deployment workflow is defined at `.github/workflows/deploy-pages.yml`.

## Tooling Notes

- ESLint is intentionally kept on v9 for now.
- ESLint v10 is currently deferred due to peer dependency incompatibilities in the lint plugin stack.
- Revisit ESLint v10 in a dedicated upgrade PR once ecosystem support stabilizes.
