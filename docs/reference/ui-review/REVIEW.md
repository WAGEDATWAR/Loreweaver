# UI evaluation - v0.8.0 + navigation pages (2026-11-12)

> **Status.** Reference evidence for DEF-125; it has no authority over `docs/UI.md`. The redesign
> (DEF-126) acts on it. Rerun the capture with `npm run ui:review` and `npm run ui:keyboard`.

## 1. Method and its limits

- **Captured:** 24 states (4 pages, 18 dialogs, nav open or collapsed, an empty search, two light-theme
  states) at 1440x900, 1024x768, 390x844 and 320x760. 14 key screenshots are kept in `shots/`; the full
  set regenerates into `test-results/ui-review/`. `metrics.json` holds the measured data.
- **Measured per state:** touch-target size (24 px on desktop, 44 px on phones), text under 11 px,
  truncation, horizontal overflow, dialog height against the viewport, heading outline.
- **Reviewed by eye:** the screenshots against the design tokens and the five core jobs.
- **Keyboard pass:** an automated Tab walk of the Entries and Library pages, dialog open/close focus
  behaviour and focus rings (`keyboard.json`).
- **Not done, so not claimed:** no human usability sessions, no real screen reader (NVDA, VoiceOver:
  DEF-043 stays open), no real devices (viewports are emulated at device scale 1), no performance review.
- **A standing lens (decision from the user):** lorebooks and character cards are to get the same care
  and presentation. Every finding below was also asked of cards, and section 4 is the parity matrix.

## 2. What already works

- Axe reports zero violations on every page, dialog and both themes; contrast passes in both themes.
- The entry list is now the centre of the Entries sidebar (the old buried-list defect is fixed).
- Keyboard: dialogs take focus on open, trap it, close on `Escape` and return focus to their trigger; the
  card dialog's tab order follows the visual order; page changes move focus to the page heading; tab order
  is logical and no control is reachable only by mouse in the paths walked.
- The page and menu structure (Library, Data, Settings) reads clearly at 1440 and 1024.
- Pages use one heading outline (`h2` page, `h3` sections) and a single `main` landmark at a time.

## 3. Ranked findings

Severity: **S1** broken or unusable in a core job, **S2** real friction or inconsistency, **S3** polish.

| ID | Sev | Finding | Evidence | Direction |
| --- | --- | --- | --- | --- |
| UI-01 | S1 | **Phones are a squeezed desktop.** At 390 px the sidebar stacks above the editor and shows about one entry; the details rail still takes 50 px; a horizontal scrollbar appears; the entry list and editor fight for 844 px. | `shots/entries-390.jpg` | Single-column master-detail: the list is a screen, an entry is a screen, details are a sheet. |
| UI-02 | S1 | **Mid widths starve the editor.** At 1024 px the menu rail, sidebar, editor and 280 px details panel leave about 340 px: the entry name shows as "Aurc", "Trigger keys" wraps, secondary keys clip. | `shots/entries-1024.jpg` | Collapse details to a drawer and the menu to a rail below about 1200 px; let the editor own its minimum width. |
| UI-03 | S1 | **Cards are second-class citizens in the interface.** See the parity matrix (section 4): no card destination in the menu, a modal instead of a workspace, no search, filter, sort, notes, bulk, history or tools. | section 4 | A card workspace as a page with the same anatomy as Entries (list, editor, details). |
| UI-04 | S2 | **Light theme is half-finished.** The details panel stays dark with unreadable labels, key-chip inputs show white patches, the panel scrolls horizontally. Axe and `npm run contrast` pass, so the gates do not see it. | `shots/light-entries-1440.jpg` | Tokenize the remaining surfaces; add a light-theme screenshot diff to the review script. |
| UI-05 | S2 | **Touch targets are too small on phones**: 46 of 49 controls on Entries are under 44 px (header buttons 34 px, nav items 36 px, chips 16 px remove buttons). On desktop 8 controls are under 24 px (key-chip remove 16 px, "Suggest keys" and "Peek" links 16 px). | `metrics.json` | A touch density with 44 px targets; enlarge chip removes with padding, not size. |
| UI-06 | S2 | **The type scale is too small and unplanned.** Dozens of text styles render at 9.5-10.5 px (section labels, hints, counts, badges, entry ids, group titles, overview stat labels). | `metrics.json` (`tiny`) | One scale with a 12 px floor for text, 11 px only for uppercase micro-labels; no inline sizes. |
| UI-07 | S2 | **The header is overloaded.** Ten tab stops before any content, an icon-only palette button whose glyph reads as "88", five groups of controls (menu, name, save state, history, file actions), and no "skip to content" link. | `keyboard.json`, any 1440 shot | Group file actions in one menu, label the palette button with its shortcut, add a skip link. |
| UI-08 | S2 | **Tools are dialogs of unequal depth.** Overview, Simulate, Issues and History are separate modals; Simulate shows a result line ("1 of 3 entries activate") before any input; Overview and Issues are static reports that would sit better as a page. Checking a book before export means opening three dialogs. | `shots/dialog-simulation-1440.jpg` | A Review page combining overview, issues and simulation for a book (and a card). |
| UI-09 | S2 | **Card editor, as a dialog, repeats the lorebook form badly on phones.** Fixed during this review: the token and checks panel overlapped the description at 390 px. Still open: that panel sits below the whole form on phones so authors never see it, and the export format picker is an unstyled native select. | `shots/dialog-card-390.jpg` | Sticky compact summary on phones; styled select; goes away with the workspace (UI-03). |
| UI-10 | S3 | **Settings is a list of buttons that open more dialogs** (Token settings, Shortcuts, Schema, Getting started). Nothing on the page is a setting you can change in place. | `shots/settings-1440.jpg` | Inline the tokenizer and context window controls; show shortcuts as a table. |
| UI-11 | S3 | **Mobile menu has no scrim and does not close on an outside tap.** | `shots/entries-nav-open-390.jpg` | Dim the page and close on tap. |
| UI-12 | S3 | **Focus rings are missing** on the sidebar resizer and on tag/key chip inputs; the Overview dialog puts initial focus on Close. | `keyboard.json` | Shared focus style for every focusable; initial focus on the first control. |
| UI-13 | S3 | **Hierarchy gaps in the Library page.** "New-entry defaults" is a bare triangle with a floating label; the card section uses a small caption where lorebooks use a heading; the lorebook settings repeat the sidebar's job. | `shots/library-1440.jpg` | One section header component; settings grouped under the lorebook they belong to. |
| UI-14 | S3 | **Command palette gaps.** It lists every command on every page and has no card commands beyond "New character card". Fixed during this review: entry commands were interleaved with the page commands. | `shots/dialog-palette-1440.jpg` | Scope to the current page, add card commands, show recent pages (DEF-127). |
| UI-15 | S3 | **Empty and loading states are thin.** One line of 10.5 px text for "No cards yet", an empty import log, no loading state for storage and backup details. | `shots/library-1440.jpg` | Shared empty-state component with a primary action (DEF-002, DEF-104). |

Fixed while reviewing (small, safe, covered by the existing gates): the card dialog overlap on phones
(UI-09 part), the command palette ordering (UI-14 part) and the stray marker above the Recent list.

## 4. Lorebook and card parity

The goal is the same care and presentation. This is how the interface treats each today.

| Capability | Lorebook | Card | Gap |
| --- | --- | --- | --- |
| Top-level destination | Entries page, menu item, `Alt+1` | none; a section inside Library | needs a destination and shortcut |
| Editing surface | full page: list, editor, details | modal dialog | a workspace (DEF-124) |
| Autosave | yes, with save state | no; Save and Cancel, discard prompt | one mental model |
| Undo and history | session undo and revisions | store undo only; not shown in the card UI | surface undo, revisions |
| Library list | sidebar list with search, filters, sort, pins, recent | flat grid, no search, filter or sort | DEF-117 |
| List item information | title, keys, flags, id, match reason, colour | name, linked book, three tags | tokens, issue count, status |
| Per-item token cost | live, with budget | live report in the dialog only | show in list and Review |
| Checks | Issues dialog, jump to field | panel inside the dialog only | one Review page for both |
| Overview and simulation | yes | none (DEF-120 prompt preview) | prompt-assembly preview |
| Notes | author notes, never exported | creator notes (exported) only | an author-only notes field |
| Bulk actions | select, tag, enable, delete, size | none (DEF-121) | multi-select and bulk tag/export |
| Duplicate, split, merge | yes | duplicate only | merge when relinking |
| Import review | diff dialog with strategies | diff dialog, add only | diff and merge on re-import (DEF-118) |
| Export | grouped formats with loss warnings | grouped formats with loss warnings | at parity |
| Global search and replace | yes | not included (DEF-122) | include cards |
| Print and schema reference | yes | none (DEF-122) | include cards |
| Templates | built-in and custom | none (DEF-119) | card templates |
| Shortcuts | `Alt+N`, `Ctrl+D`, `Alt+P`, palette | palette "New character card" only | card shortcuts |
| Responsive behaviour | poor (UI-01) | poor (UI-09) | design both together |

**Direction for the redesign:** treat "a project has books and cards" as the organizing idea. A shared
page anatomy (list, editor, details), a shared Review page, shared list-item and section components, and
a menu that names both Lorebooks and Cards. Build cards to the same checklist that lorebooks passed.

## 5. The five core jobs

| Job | Verdict | Friction found |
| --- | --- | --- |
| Write a lorebook | Good at 1440, poor on phones | UI-01, UI-02, UI-05, UI-06 |
| Import and fix a SillyTavern book | Workable | import log is on the Data page, away from the import; issues, overview and simulation are three dialogs (UI-08) |
| Build a character card | Workable on desktop only | one long form of 15 or more fields with no sections or anchors; no autosave; checks off-screen on phones (UI-03, UI-09) |
| Check a book before export | Fragmented | three separate dialogs, no single "ready to export" view, card checks live elsewhere (UI-08) |
| Move a project between browsers | Good | Data page covers backup, restore and file save/open; persistence status is shown |

## 6. Proposed order for the redesign (DEF-126)

1. **Foundation:** type scale with a 12 px floor, spacing and density tokens (comfortable, compact,
   touch), one focus style, finish light-theme tokens (UI-04, UI-05, UI-06, UI-12).
2. **Components:** page header, section card, list item, empty state, tool-result panel, menu button;
   replace the one-off versions (UI-13, UI-15).
3. **Responsive model:** master-detail on phones, drawers for details and menu below 1200 px (UI-01,
   UI-02, UI-11).
4. **Cards to parity:** a card workspace page built from the shared anatomy, then list, tokens, issues,
   notes and bulk (UI-03, UI-09; DEF-117 to DEF-124).
5. **Review page and header:** one Review page for books and cards, a leaner header with a file menu and
   skip link, scoped palette (UI-07, UI-08, UI-14; DEF-127).
6. **Settings** with real controls (UI-10).

Each step ships with the gates (axe, contrast, e2e, a scenario per page) and refreshed review screenshots.

## 7. Redesign progress

- **Step 1 (hub and menus, started 2026-11-12):** the Library is the home hub for lorebooks and cards
  (U-12), the left menu is editor-only (U-7), routes carry project ids (U-8), and cards have an autosaving
  editor page (DEF-124). This addresses UI-03 for destination, editing surface, autosave and library
  presentation; UI-07 and UI-13 in part. The card and lorebook parity rows for search and filter, list
  information, shortcuts and the editing surface are now at parity; tokens in list, notes, bulk actions,
  history and the Review page remain (DEF-117 to DEF-123, DEF-133 to DEF-135).
- **Next:** foundation tokens (type scale, touch density, light theme), then the responsive model
  (DEF-128, DEF-129).
- **Step 2 (foundation, 2026-11-23):** a 12 px text floor (11 px only for uppercase micro-labels and count
  badges; measured text under 11 px fell from dozens per state to none), 44 px touch targets on phones
  and touch devices with enlarged hit areas for chip removes and link buttons (header controls stay at 40 px
  so 320 px holds; Import is hidden at 430 px and below because the Library and Data pages carry it), one
  focus style, and the light theme completed for the details panel, chip inputs and diff surfaces. This
  addresses UI-04, UI-05, UI-06 and UI-12 in part. Still open: the phone master-detail layout and mid-width
  drawers (UI-01, UI-02), the Review page, the header file menu and skip link.
- **Step 3 (responsive, 2026-11-23):** the details panel is an overlay below 1180 px with a Details button,
  the editor menu and details follow the window width until you choose, and phones get a list screen and an
  editor screen instead of a stacked layout. This addresses UI-01 and UI-02. Still open: card parity
  extras (list tokens, notes, bulk, history), the Review page, the header file menu, Settings with real
  controls.
