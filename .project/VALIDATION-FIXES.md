# Obsidian Plugin Validation Fixes

Tracking fixes required for Obsidian Community Plugin submission.

## Summary of Issues

| Category | Count | Status |
|----------|-------|--------|
| Use Vault#configDir instead of .obsidian | 7 | ✅ Fixed |
| Don't detach leaves in onunload | 1 | ✅ Fixed |
| Deprecated substr | 8 | ✅ Fixed |
| confirm() usage | 9 | ✅ Fixed |
| innerHTML usage | 17 | ✅ Fixed |
| Unexpected any type | 7 | ✅ Fixed |
| Sentence case for UI text | ~30 fixed | ✅ Complete |
| Promises must be awaited/caught/voided | 165 | ✅ Fixed |
| Avoid element.style.* - use CSS classes | 88 remaining (dynamic) | ✅ Maximally Fixed |

---

## Completed Fixes (2025-12-30)

### ✅ High Priority Fixes

1. **Hardcoded .obsidian paths** (7 instances)
   - Created `getPluginDir()` and `getPluginDataPath()` methods using `configDir`
   - Updated all hardcoded paths to use these methods

2. **detachLeavesOfType in onunload** (1 instance)
   - Removed - Obsidian handles this automatically

3. **Deprecated .substr()** (8 instances)
   - All replaced with `.substring()`

4. **Browser confirm()** (9 instances)
   - Created `ConfirmModal` class and `showConfirmModal()` helper
   - All confirm() calls replaced with async modal

5. **innerHTML usage** (17 instances)
   - Replaced with DOM APIs (createEl, textContent, appendChild)
   - Created `populateWithHighlightedText()` for search highlighting
   - SVG icons replaced with `setIcon()`

6. **Any types** (7 instances)
   - Replaced with `unknown` or proper typed interfaces
   - Added type assertions at call sites

---

## Remaining Issues (Large Scope)

### ✅ Inline Styles (88 remaining - all dynamic)

Converted all static inline styles to CSS classes. Remaining 88 are genuinely dynamic:
- Progress bar widths (dynamic percentages)
- Menu/tooltip positioning (click-based coordinates)
- Dynamic colors from user data (highlights, layers, heatmaps)
- User settings (font size, font family, colors)
- Chart bar dimensions
- CSS custom properties (setProperty calls - acceptable)

**These cannot be converted to CSS classes as they're computed at runtime.**

### ✅ Sentence Case (complete)

Fixed all user-facing UI text. Remaining Title Case items are intentional:
- **Product names:** Bible Portal, Theographic
- **Proper nouns:** Bible, Old Testament, New Testament, Matthew Henry, Strong's
- **Feature names:** Verse of the Day (established name)
- **Achievement names:** Styled as titles (First Steps, Dedicated Reader, etc.)

### ✅ Promise Handling (165 instances) - COMPLETED

All floating promises now properly handled:
- `await` for async operations that need sequencing
- `void` for fire-and-forget async calls in non-async handlers
- `.catch()` for clipboard operations with error handling

---

## Progress Log

### 2025-12-30
- Created this tracking file
- Fixed all high-priority issues (7 categories):
  - ✅ configDir instead of hardcoded .obsidian (7 instances)
  - ✅ Removed detachLeavesOfType in onunload
  - ✅ Replaced .substr() with .substring() (8 instances)
  - ✅ Created ConfirmModal and replaced confirm() (9 instances)
  - ✅ Replaced innerHTML with DOM APIs (17 instances)
  - ✅ Fixed any types with proper types (7 instances)
- Fixed ~30 sentence case issues in major UI text
- Build passes successfully
- ✅ Completed all promise handling (saveSettings, saveHighlightsAndNotes, render, clipboard)
- ✅ Added CSS utility classes (.bp-clickable, .bp-hidden, .bp-link, etc.)
- ✅ Converted 24 cursor:pointer to .bp-clickable class
- ✅ Converted ~10 display toggles to addClass/removeClass
- Remaining: inline styles (136 left), more sentence case

### 2025-12-30 (continued)
- ✅ Converted all display toggles to bp-hidden class (23 instances)
- ✅ Added CSS utility classes: .bp-modal-buttons, .bp-input-full, .bp-input-spaced, .bp-input-padded, .bp-input-monospace, .bp-btn-container, .bp-credits-list
- ✅ Converted input styling patterns (4 instances)
- ✅ Converted userSelect patterns to bp-select-text (2 instances)
- ✅ Converted button container styling (2 instances)
- ✅ Converted credits list styling (1 instance)
- Inline styles reduced from 136 to 88 (all remaining are dynamic values)
- Build passes successfully

### 2025-12-30 (sentence case fixes)
- Fixed modal titles: "Select Bible translation", "Delete highlight", "Delete multiple highlights", "Clear all visible highlights", "Delete bookmark", "Clear all bookmarks"
- Fixed button labels: "Move to layer", "Go to verse", "Go to location", "Open note", "Create note", "Add another note", "Copy all references", "Download Bible translation"
- Fixed search result titles: "Search results for...", "Note search results for..."
- Fixed tooltip: "Open Bible Portal settings"
- Fixed message text: "Add verse" reference
- Note: Many Title Case items are intentional (proper nouns like "Bible Portal", "Matthew Henry", "Strong's", "Theographic", "Verse of the Day")

### 2025-12-30 (additional sentence case fixes)
- Fixed sidebar mode: "Strong's lookup"
- Fixed heading: "Strong's concordance lookup"
- Fixed button: "View in Strong's lookup →"
- Fixed download modals: "Downloading Theographic data", "Downloading Strong's concordance & interlinear data"
- Fixed settings group titles: "Copy & export", "Today's readings", "% complete", "Import & export"
- Fixed tab label: "Cross-refs"
- All UI text now follows sentence case (except proper nouns and achievement names)

