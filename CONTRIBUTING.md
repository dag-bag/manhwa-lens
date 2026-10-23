# Contributing to Manhwa Lens

Thank you for your interest in improving Manhwa Lens! Whether you're fixing a bug, improving OCR accuracy, or helping with documentation, your contributions are welcome.

## Code of Conduct

Please be respectful, constructive, and helpful to fellow contributors and community members.

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/manhwa-lens.git
   cd manhwa-lens
   ```
2. Install dependencies:
   ```bash
   pnpm install --ignore-scripts
   ```
3. Build the extension:
   ```bash
   pnpm build
   ```
4. Load the compiled extension from `dist/manhwa-lens` into Chrome or Edge via `chrome://extensions` -> "Load unpacked".

## Running Tests

Before submitting a Pull Request, ensure that all tests pass:

```bash
# Run unit tests
pnpm test

# Run real-world manhwa panel regression test
pnpm test:panel

# Run full Playwright headless browser test
pnpm test:browser
```

## Pull Request Guidelines

1. **Branch Naming:** Use clear branch names like `fix/bubble-overlap` or `feat/vietnamese-support`.
2. **Commit Messages:** Follow conventional commits (e.g. `feat: ...`, `fix: ...`, `docs: ...`).
3. **No Breaking Changes to Privacy:** All OCR must strictly run locally in the offscreen worker. Never add cloud services that upload user images or screenshots.
4. **Clean Builds:** Ensure `pnpm build` completes without errors and hashes are verified.

Thank you for helping make Manhwa Lens better!
