# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.1.0]

### Added
- Three report-card templates: **Minimal** (many cards per A4 sheet), **Professional** and **Playful**.
- Six colour themes (Ocean, Emerald, Sunset, Royal, Rose, Graphite) that apply to every template.
- Automatic "cards per sheet" selection with a manual override, and a summary-rows option (none / average / total + average).
- Millimetre-exact layout engine: row heights are derived so every card fits its cell on A4.
- Project logo, favicon set and social banner.
- Standalone executables (Windows, macOS, Linux), a portable Node bundle and a multi-arch Docker image, all built by GitHub Actions.
- Command-line options (`--port`, `--host`, `--no-open`, `--version`, `--help`) and `PORT`/`HOST`/`NO_BROWSER` environment variables.
- Unit, integration and real-browser layout tests; reproducible benchmarks.

### Changed
- The server now binds to `127.0.0.1` by default so student data is not exposed on the local network. Use `--host 0.0.0.0` to share it.

## [1.0.0]

### Added
- Rewrite in TypeScript with a step-by-step wizard (Excel import or manual entry), user-defined subjects with numeric or
  categorical grading, English and Persian (RTL) interface, print and PDF export.
