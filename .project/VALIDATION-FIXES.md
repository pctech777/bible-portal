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
| Sentence case for UI text | 172 | ⏳ Pending |
| Promises must be awaited/caught/voided | 165 | ⏳ Pending |
| Avoid element.style.* - use CSS classes | 150+ | ⏳ Pending |

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

### ⏳ Inline Styles (150+ instances)

These require creating CSS utility classes and converting each `.style.*` assignment:
- Dynamic widths/heights
- Dynamic colors (highlight colors, layer colors)
- Dynamic visibility (display: none/block)
- Position styles for tooltips/menus

**Approach needed:** Create CSS custom properties for dynamic values

### ⏳ Sentence Case (172 instances)

All UI text needs review:
- Button labels
- Menu items
- Setting names/descriptions
- Tab names
- Modal headings

**Example conversions needed:**
- "Show Answer" → "Show answer"
- "Delete Note" → "Delete note"
- "Cross-References" → "Cross-references"

### ⏳ Promise Handling (165 instances)

Many event handlers have unhandled promises. Need:
- Add `await` where appropriate
- Add `.catch()` for error handling
- Use `void` for intentionally unhandled promises

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
- Remaining: inline styles (150+), more sentence case, promise handling

