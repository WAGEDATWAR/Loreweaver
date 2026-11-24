# UI - layout, tokens, interaction, accessibility

> **Scope.** This document owns the visual system: layout, design tokens, typography, spacing, component
> shape, interaction patterns, accessibility and responsive behavior. Authoring behavior is
> `docs/EDITOR.md`; copy lives with the surfaces here.

**Status:** built. Audited by `npm run a11y`; zero critical, serious or moderate violations.

---

## 1. Layout and navigation

The app has two modes, and the navigation follows the mode.

**Hub mode: the Library is home.** The Library lists every lorebook and character card as an openable
tile: kind, name, size, linked lorebook, tags, an issue count and a description excerpt. It has search, a
kind filter (All, Lorebooks, Cards), a sort (recently edited, name, largest) and the actions New
lorebook, New character card and Import. A tile opens the editor for that project; its hover or focus
actions duplicate or delete it. Data and Settings are the other hub pages. Hub pages have no side menu.

```text
+--------------------------------------------------------------------+
| [mark Loreweaver v]                      save state   history  file |
+--------------------------------------------------------------------+
| Library                                [New lorebook][New card][Import] |
| [search] [All|Lorebooks|Cards] [sort]                              |
| +--------------+ +--------------+ +--------------+                 |
| | tile: Aurora | | tile: Mara   | | tile: ...    |                 |
| +--------------+ +--------------+ +--------------+                 |
+--------------------------------------------------------------------+
```

**Editor mode: one project, one menu.** Opening a lorebook or card enters the editor and shows the
editor menu on the left, which carries only what that editor needs:

```text
+-------------+------------------+-----------------------------+----------+
| < Library   | Entries sidebar  | entry editor                | Details  |
| LOREBOOK    | picker, search,  |                             |          |
| Aurora Vale | filters, list    |                             |          |
| Entries     |                  |                             |          |
| Lorebook    |                  |                             |          |
|  settings   |                  |                             |          |
| TOOLS       |                  |                             |          |
|  Overview...|                  |                             |          |
| Collapse    |                  |                             |          |
+-------------+------------------+-----------------------------+----------+
```

- **A lorebook** shows Entries and Lorebook settings (description, tags, token budget, new-entry
  defaults, duplicate, split, merge, delete), and the Tools: Overview, Simulate, Issues, Search all and
  Find and replace.
- **A character card** shows its sections (Identity, Definition, Greetings, Examples and prompts,
  Lorebook link) as jump links. The card page autosaves like a lorebook, with a live token report and
  checks beside the form, and Duplicate, Export and Delete in its header. A card left completely blank
  is discarded when you leave it.
- The menu has a **Library** link at its top, the project's name and kind, and a Collapse control that
  turns it into a 54 px icon rail (remembered). On phones it is an overlay opened from the header.

**The brand is the app menu.** The logo and name at the left of the header open a small menu with the
hub destinations (Library, Data, Settings), the command palette, keyboard shortcuts and About. It is
available everywhere and closes on selection, an outside click or `Escape`.

**Routes.** The location hash is the only view state (`src/views.js`), so Back, reloads and links work:

| Route | Shows | Shortcut |
| --- | --- | --- |
| `#/library` (default) | the Library hub | `Alt+1` |
| `#/data` | import, export, project files, backup, storage, integrity, import log | `Alt+2` |
| `#/settings` | theme, density, tokenizer, shortcuts, schema reference, guide | `Alt+3` |
| `#/book/<id>` | the lorebook editor (`#/entries` opens the last-used lorebook) | palette |
| `#/book/<id>/settings` | lorebook settings | palette |
| `#/card/<id>` | the card editor | palette |

The palette has a `Go to` command for every hub page and an `Open lorebook:` or `Open card:` command
for every project. The window title names the project or page.

The **entries sidebar** holds only what is needed to find and open an entry: a compact lorebook picker
(switching goes through the route), search, filters, a collapsed Recent list, the sort control, the entry
list (which takes the remaining height), the bulk bar and the New entry actions.

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

A full light token set (`:root[data-theme="light"]`) mirrors every dark token; the theme is toggled in
the About panel and the command palette and persists locally. Both themes are held to WCAG AA by
`npm run contrast`, which parses the token blocks and checks the text pairs in CI.

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
- The export dialog is only about choosing an output. Targets are grouped (Recommended, Other frontends,
  Loreweaver files, Character card). Backup, restore and storage diagnostics live on the Data page.
- Above 120 entries the sidebar windows the list: only visible rows plus an 8-row overscan render,
  spacers hold the scroll height, and the active card stays focused.
- Book descriptions, tags, the token budget and new-entry defaults live on the lorebook's settings page;
  the overview and validation controls are Tools in the editor menu.
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

- **Above 1200 px:** the editor menu is expanded (208 px) unless you collapsed it, with the entries
  sidebar, the editor and the details panel side by side.
- **1180 px and below:** the details panel is an overlay opened from the **Details** button in the entry
  header, so the editor keeps its width (it is collapsed by default); the editor menu defaults to the 54 px
  rail. Choosing an option yourself is remembered and stops the automatic change.
- **780 px and below:** entries are two screens. Opening a lorebook shows the entry list full screen;
  choosing an entry shows the editor full screen, and the list button in the header returns to the list.
  The editor menu is an overlay opened from the header and card pages stack their summary above the form.
- Hub pages use the full width at every size and never overflow horizontally.
- 600 px and below: the header drops Open and Save (they stay on the Data page and in the palette).
- 430 px and below: the header also drops Import (the Library and Data pages carry it), the save label is
  hidden and dialog padding is compact.
- Text is never below 12 px, except uppercase micro-labels and count badges (11 px). Touch devices and
  phone widths get 44 px targets; header controls stay at 40 px so 320 px fits.

## 8. Known gaps

- The Tools (Overview, Simulate, Issues, History) are still dialogs; promoting them to pages belongs to
  the UI redesign (DEF-126).
- A light theme ships opt-in (DEF-031); both themes pass `npm run contrast` (DEF-112).
- There is no density option or remembered text-area height (DEF-032, DEF-033).
- Virtualized rows hide tag chips and the matched-field note; the full card returns when the list is
  narrow or below the windowing threshold.

## 9. UI evaluation and redesign (planned, P5)

The navigation and page split fixed the worst clutter, but the interface has grown feature by feature
and has never had a deliberate evaluation. Before v1 it gets one (DEF-125) and a redesign that acts on it
(DEF-126):

1. **Evaluate** with evidence (done, see `docs/reference/ui-review/REVIEW.md`): a heuristic review of every page and dialog against the design tokens, a
   task-based walk-through of the five core jobs (write a book, import and fix a SillyTavern book, build a
   card, check a book before export, move a project between browsers) at 1440, 1024, 390 and 320 px, a
   keyboard-only and screen-reader pass (DEF-043), and screenshots of each state kept under
   `docs/reference/ui-review/`. Findings are ranked and each becomes a ledger row or a fix.
2. **Redesign** what the evaluation proves: the visual language (type scale, density, colour roles, icon
   set), the page information architecture, Tools promoted to pages, a card workspace, empty and loading
   states (DEF-002, DEF-104), and a consistent component set so a new surface is assembled, not invented.
3. **Hold the redesign to the gates**: axe zero violations, `npm run contrast`, the e2e suite, and a
   scenario per page.

Lorebooks and character cards get the same care and presentation: every finding is asked of both, and
the review holds a parity matrix. The pass may change layout and styling freely; it may not change the data model, the adapter contract or
the pure core.

## 10. Definition of done

A surface change ships with an axe pass at 1440, 390 and 320 px, a focus-target check, keyboard access,
and a browser scenario. A new dialog is added to `e2e/a11y.mjs` in the same change.

