CableGuy E2E Tests (Playwright)

This repository contains the end-to-end (E2E) test automation for the CableGuy section of the Thomann website. The tests are implemented using Playwright and typescript.

Task Details

The test scenario includes selecting cables, filtering by manufacturer, and validating that the right amount of items is shown.

Test Steps

Step 1: Cable Beginning Selection

Click on the "Cable Beginning" section.
Select a random Cable Type and then a random Cable within that type.
Step 2: Cable End Selection

Click on the "Cable End" section.
Select another random Cable Type and then a random Cable within that type.
Step 3: Manufacturer Selection

Choose a random Manufacturer from the available options.
Validate that the number of products displayed matches the expected number indicated below the manufacturer’s logo.



Project layout
THOMANN.IO/
├─ page-objects/
│  └─ CablePage.ts
├─ tests/
│  └─ cable_purchase.spec.ts
├─ playwright.config.ts
├─ .github/workflows/playwright.yml     # CI
├─ playwright-report/                   # HTML reports (generated)
├─ test-results/                        # traces/screens/videos (generated)
└─ Readme.md

Prerequisites

Node.js ≥ 18 (node -v)
npm ≥ 9
macOS/Linux/Windows

Setup
npm ci
npx playwright install --with-deps

Run tests

All tests (headless):
npx playwright test

Headed (see the browser):
npx playwright test --headed

Reports & artifacts
HTML report:
npx playwright show-report
Traces/screens/videos are under test-results/ (configured in playwright.config.ts).

Page Object usage
CablePage.ts encapsulates all UI actions:

Troubleshooting
Selectors changed? Update them in page-objects/CablePage.ts.
No brands/counts? Use the Debug Console to see the test logs, that might be helpful in debugging.


