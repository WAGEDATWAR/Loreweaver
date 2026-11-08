# UI - layout, tokens, interaction, accessibility

> **Scope.** This document owns the visual system: layout, design tokens, typography, spacing, component
> shape, interaction patterns, accessibility and responsive behavior. Authoring behavior is
> `docs/EDITOR.md`; copy lives with the surfaces here.

**Status:** built. Audited by `npm run a11y`; zero critical, serious or moderate violations.

---

## 1. Layout

```text
+------------------------------------------------------------------+
| brand | lorebook name | save state                  Import Export |
+----------------+-------------------------------------------------+
| lorebook switcher | entry name            Enabled   Delete      |
| search            | trigger keys | secondary keys               |
| entry list        | content + live statistics                    |
|                   | injection settings + option chips            |
| new entry         |                                             |
+----------------+-------------------------------------------------+
```

The sidebar is the library. The main pane is the document. There are no nested settings pages.

## 2. Design tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0b0d12` | App background |
| `--surface` | `#11151c` | Main panels |
| `--surface-sunken` | `#0e1118` | Inputs |
| `--surface-raised` | `#161b24` | Dialog, raised UI |
| `--border` | `#232936` | Default separators |
| `--text` | `#e9edf4` | Primary text (16.5:1 on background) |
| `--muted` | `#99a3b5` | Secondary text (7.2:1 on surface) |
| `--faint` | `#7c8799` | Hints and labels (5.0:1 on surface) |
| `--accent` | `#8fa8ff` | Selection, focus, primary actions (8.5:1) |
| `--danger` | `#ff8795` | Destructive actions (8.0:1 on surface) |
| `--success` | `#7ee2b8` | Enabled and status accents |

Selected surfaces use accent tints rather than saturated fills. Borders carry structure. Shadows are
reserved for dialogs and toasts.

## 3. Typography

- System UI stack, no web-font dependency.
- 13-14 px for controls and body UI, 22 px for the entry title.
- 10.5 px uppercase labels with wide tracking for navigation and section structure.
- Content editing uses 14 px with 1.68 line height for sustained reading.
- Monospace only for counts, numeric values and shortcut hints.

## 4. Spacing and shape

- 4 px base rhythm; 12-26 px section spacing.
- 8 px controls, 12 px content surfaces, 16 px dialogs.
- 1 px borders at low contrast; stronger borders only on hover or focus.
- Subtle radial background glow for depth without competing with text.

## 5. Interaction patterns

- Autosave is default; the header communicates Saving, Saved, Unsaved or Error.
- Destructive actions require confirmation; ordinary actions do not.
- Import confirmation is a diff review with format, counts, warnings, a strategy control and the
  resulting book and entry changes. It creates a pre-import backup before applying.
- The export dialog offers a full project backup plus single-book native, SillyTavern, Chub and
  character-book targets, and reports local storage usage.
- Book descriptions live in a collapsible lorebook-information section with a one-line preview, beside
  the overview and validation controls.
- The validation control summarizes issues; its dialog groups issues by type, lets category counts
  filter the list, and jumps to the affected entry.
- The lorebook actions dialog duplicates, splits or merges the active book; merging remaps ids.
- Entry cards show compact ids with the full id in a tooltip and are visually anchored when active.
- Multi-selected entries differ from the active entry; the bulk bar exists only while a selection does.
- Inline options are chips; grouped numeric and enumerated settings live in one injection row.
- Empty states explain the next action and expose the primary call to action.
- Toasts confirm imports, exports, failures, duplication, bulk changes and deletions.

## 6. Accessibility

- Text colors meet WCAG AA at their intended size; muted and faint are tested against their surface.
- Visible focus rings; the native dialog provides focus containment.
- Every input has a label; icon-only buttons have `aria-label` and `title`.
- Save state, entry count and selection count are live regions.
- Entry controls have keyboard equivalents, including list navigation and `Alt+Arrow` reordering.
- `prefers-reduced-motion` disables animation.
- Imported strings render with `textContent`, so no imported HTML executes.

## 7. Responsive behavior

- Above 780 px: auto-fitted 200-460 px library plus fluid editor; never overflow horizontally.
- 780 px and below: stacked library above the editor with internally scrolling content and a compact
  header.
- Collapsing the library uses a 50 px rail at every width.
- 1000 px and below: two-column settings.
- 900 px and below: compact topbar, brand text hidden.
- 600 px and below: single-column fields, icon-only import/export.
- 430 px and below: hidden save label, compact dialog padding, hidden export meta pills.

## 8. Known gaps

- A mobile library drawer is deferred (DEF-030).
- A light theme waits on token stability (DEF-031).
- There is no density option or remembered text-area height (DEF-032, DEF-033).

## 9. Definition of done

A surface change ships with an axe pass at 1440, 390 and 320 px, a focus-target check, keyboard access,
and a browser scenario. A new dialog is added to `e2e/a11y.mjs` in the same change.
