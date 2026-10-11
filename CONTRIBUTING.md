# Contributing

Thanks for helping improve Report Card Studio!

```bash
git clone https://github.com/sobhanmohammadi-dev/ReportCardStudio.git
cd report-card-studio
npm install
npm run build
npm run dev          # builds the client and starts the server with tsx
```

Before opening a pull request:

```bash
npm run typecheck    # server, client and tests
npm test             # unit + integration tests
CHROME_PATH=/path/to/chrome npm run test:layout   # A4 layout checks in a real browser
```

## Guidelines

- **Translations:** every user-visible string lives in `src/client/i18n.ts`. Add each key to *both* languages;
  the TypeScript compiler fails the build if one is missing.
- **Report templates:** see "Adding a template" in the README. Sizes are in millimetres and must be mirrored in
  `src/client/report/geometry.ts`; the layout test fails if a card overflows.
- **Class names:** `static/css/report.css` and `static/css/app.css` must not share class names (a test enforces this).
- Keep pull requests focused and add or update tests for behaviour changes.
