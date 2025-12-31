# Bible Portal - Status

**Last Updated:** 2025-12-31
**Current Version:** 1.6.0
**Project Status:** Active Development

---

## Current Branch

**Branch:** main
**Released Version:** 1.6.0

---

## Recently Completed

### v1.6.0 Release (2025-12-31)

**Collections Overhaul:**
- Removed progress tracking from collections (#1)
- Added verse cards with full text display (#4)
- Added import functionality to match export (#5)
- Added title/description fields for each card (#6)
- Fixed case normalization for verse references (#3)
- Added verse input validation and multi-verse support (#2)

**Obsidian Community Plugin Compliance:**
- Fixed ~500+ eslint errors for plugin submission
- Added proper TypeScript types and interfaces
- Fixed all Promise handling issues (no-misused-promises, no-floating-promises)
- Converted ~200 inline styles to CSS classes with custom properties
- Fixed command ID/name to not include plugin name
- Applied sentence case to UI text (proper nouns remain capitalized)
- Added eslint.config.mjs with typescript-eslint recommended rules
- Updated TypeScript from 4.7.4 to 5.4.5 for CI compatibility

**Other Improvements:**
- Add @reference insert feature for Bible verses in notes
- Fix note previews, commentary display, and Strong's word scroll
- Add settings button to left sidebar
- Add toast notification types (success/error/warning)

**Submission Status:**
- PR #9199 submitted to obsidianmd/obsidian-releases
- Validation passed
- Awaiting review from Obsidian team

---

## Completed Phases

### Core Functionality (v1.0.0 - v1.2.0)
- Phase 1: Data Foundation & Basic Viewer
- Phase 2: Multi-Version Support & Lookup Modes
- Phase 3: Highlighting & Notes Foundation
- Phase 4: Advanced Notes & Search
- Phase 5: Cross-References
- Phase 6: Copy & Export Features
- Phase 7: Verse of the Day
- Phase 8: Strong's Concordance Integration
- Phase 9: Theographic Metadata Integration
- Phase 10: Jesus Words Highlighting
- Phase 11: Polish & Optimization
- Phase 12: Additional Features (Concordance, Tagging, Import/Export)

### Advanced Features (v1.3.0 - v1.5.0)
- Phase 13: Complete UI/UX Overhaul
- Phase 14: Notes Browser Enhancement ("Reflections Hub")
- Phase 15: Power Features (Reading Plans, Annotation Layers, Memorization Mode)
- Phase 16: Layer Management Enhancement

### v1.6.0
- Phase 17: Collections Overhaul
- Phase 18: Obsidian Plugin Linting Compliance

---

## Pending Features

**Memorization Improvements (Issues #7, #8):**
- Support verse ranges, not just single verses (#7)
- Make verses clickable in memorization mode (#8)

**Security & Code Quality (from v1.5.0 audit):**
- MED-001: Sanitize HTML in search query highlighting (XSS prevention)
- MED-002: Escape regex special characters in search (ReDoS prevention)
- MED-003: Add comprehensive validation for imported data
- MED-004: Improve settings merge logic (prevent data loss)
- LOW-001: Add user-facing error messages for failed operations
- LOW-002: Use normalizePath for all file path construction

---

## Known Issues

**Autofill Bug:**
- When typing a reference (e.g., `@Acts`), the autofill suggestions append "Book" to each book title (e.g., "ActsBook" instead of "Acts")
- Should show just the book name

**ESLint False Positives (145 total):**
- 141 sentence-case: Proper nouns (Bible, Strong's, Hebrew, Greek, book names)
- 4 static-styles: Legitimate style.setProperty() for CSS variables

---

## Feature Requests

**@votd Function:**
- Add `@votd` autocomplete to insert the Verse of the Day into notes
- Similar to the existing verse reference insertion feature

---

## Key Statistics

- **Total Phases Completed:** 18
- **Released Version:** 1.6.0
- **Lines of Code:** ~21,000 (main.ts)
- **Security Audits:** 2 (both APPROVED)
- **GitHub Issues Closed:** #1, #2, #3, #4, #5, #6

---

## Recent Commits (main)

```
46c32d6 Fix TypeScript version conflict for CI
249f57c Bump version to 1.6.0
4b5b3b7 Merge pull request #9 - v1.6.0: Collections overhaul + Obsidian linting fixes
8ccb3b0 Fix eslint errors for Obsidian community plugin submission
136351d Merge origin/main, keep dev branch (remove debug logs)
```

---

## Links

- **GitHub Repo:** https://github.com/pctech777/bible-portal
- **Release 1.6.0:** https://github.com/pctech777/bible-portal/releases/tag/1.6.0
- **Obsidian Submission PR:** https://github.com/obsidianmd/obsidian-releases/pull/9199
