# Run Statement at Cursor (Multi-Statement SQL Fix)

## Summary
Fix the bug where writing two or more `;`-separated SQL statements in one editor tab and hitting Run sends the entire buffer as a single query, producing an invalid `SELECT * FROM (<multi-statement text>) AS _kueri_paged ...` wrapper and a driver syntax error. The fix makes Run execute only the statement under the cursor (like DataGrip/TablePlus), and adds a backend guard so multi-statement input is rejected with a clear error instead of silently mis-wrapped, as defense in depth.

## Type
- [x] Bug fix (with a small UX addition: cursor-aware statement selection)

## Context from conversation
- **Root cause (from prior RCA):** `Workspace.tsx:116` `runQuery` sends the whole `draftSql` buffer as one `sql` string. Backend `trimStatement` (`api/internal/modules/query/sqlutil.go:46-50`) only strips a single trailing `;`; it does not split multi-statement text. `PreparePaginatedSQL`/`PrepareFilteredPaginatedSQL` then wrap the (still multi-statement) text in `SELECT * FROM (...) AS _kueri_paged LIMIT/OFFSET`, which is invalid SQL when more than one statement is present.
- **Existing building blocks found in codebase:**
  - Backend: `HasMultipleStatements(sql string) bool` already exists at `api/internal/modules/query/filter_eligibility.go:38-42` (detects, doesn't split) — currently only used to disable column filtering.
  - Backend: `trimStatement` / `stripSQLCommentsAndLiterals` in `api/internal/modules/query/sqlutil.go`.
  - Frontend: TS mirror of the same helpers in `web/src/lib/sql-query.ts` (`trimStatement`, `stripSQLCommentsAndLiterals`, `isReadQuery`, `hasExplicitLimit`).
  - Editor: `web/src/components/kueri/SqlEditor.tsx` uses CodeMirror 6, exposes `onRun?: () => void` wired to `Mod-Enter` (line 75-82) and to `onEditScript` for `Mod-e`. No access today to cursor position or per-statement text from the caller.
  - Caller: `web/src/components/kueri/Workspace.tsx:116-173` `runQuery` — builds and sends `{ sql, connection_id }` to `executeMutation`.
- **Decision (user-selected):** Implement "Run statement at cursor" — split by `;` at the top level (ignoring semicolons inside strings/comments) and execute only the statement containing the cursor. Not "reject with error" alone, and not "run all statements sequentially."
- **Constraints:** Reuse existing comment/string-stripping logic rather than introducing a full SQL parser. Keep frontend (TS) and backend (Go) splitting logic consistent in behavior, since the backend guard must agree with what the frontend already filtered down to.

## Scope

### In scope
- A statement-splitting utility (frontend, TS) that, given full editor text and a cursor offset, returns the SQL statement under the cursor (trimmed, without surrounding semicolon).
- Wiring `SqlEditor` to pass the CodeMirror cursor position back to `onRun`, and `Workspace.runQuery` to execute only that statement instead of the whole buffer.
- A backend guard (Go) that rejects multi-statement input passed to `Execute` with a clear, user-facing error, using the existing `HasMultipleStatements` detector — defense in depth in case any caller (API used directly, future feature) sends multi-statement text.
- Unit tests for the new splitting utility (TS) and the new guard (Go).
- Manual verification in the running app with the exact reproduction from the bug report.

### Out of scope
- Running all statements sequentially / multi-result-set UI.
- Visual highlighting of "which statement will run" in the editor gutter/background (nice-to-have, not required by the chosen option).
- Changing the pagination/filter wrapping SQL itself (`_kueri_paged` / `_kueri_filtered`) — it stays single-statement, which is now guaranteed by the fix.
- History/tab persistence changes beyond recording the executed statement (not the whole buffer) if that's how `pushHistory` already behaves — verify but don't redesign history.

## Implementation steps

### Phase 1: Shared statement-splitting utility (frontend)
**Goal:** A pure, testable function that finds top-level `;` boundaries (ignoring those inside string literals and comments) and returns the statement containing a given offset.

| # | Task | Files / area | Notes |
|---|------|--------------|-------|
| 1 | Add `getStatementAtCursor(fullText: string, cursorOffset: number): string` to `web/src/lib/sql-query.ts` | `web/src/lib/sql-query.ts` | Reuse `stripSQLCommentsAndLiterals` to build a same-length masked string (comments/literals blanked, code untouched) so `;` positions map 1:1 back to the original text. Find all top-level `;` offsets in the masked string, use them to derive statement `[start, end)` ranges over the **original** text, then return `original.slice(start, end)` for the range containing `cursorOffset`, trimmed and with its own trailing `;` stripped via existing `trimStatement`-style logic. |
| 2 | Handle edge cases: cursor in leading/trailing whitespace between statements, empty statements (e.g. `;;`), cursor at very start/end of doc, single-statement doc (no `;`) | same file | Empty/whitespace-only statement between two `;` → falls back to nearest non-empty statement (prefer the one before cursor, else after). Single statement with no `;` → return whole trimmed text (current behavior preserved). |
| 3 | Export the function; keep `trimStatement` exported too if not already (currently private) since Phase 2 needs it for display/history purposes | same file | Check current export list before changing. |

**Done when:**
- [ ] `getStatementAtCursor` correctly isolates each statement for the bug's exact repro case (cursor in statement 1 → returns `select distinct type from employee_dropdown_options`; cursor in statement 2 → returns `select * from employee_dropdown_options\nwhere type = 'Eselon'`).
- [ ] Handles semicolons inside string literals (e.g. `where type = 'A;B'`) without treating them as statement separators.
- [ ] Handles single-statement docs identically to today's `draftSql.trim()` behavior.

### Phase 2: Wire cursor-aware Run through the editor and Workspace
**Goal:** `Mod-Enter` / Run button executes only the statement at the cursor.

| # | Task | Files / area | Notes |
|---|------|--------------|-------|
| 1 | Change `SqlEditorProps.onRun` signature from `() => void` to `(statementSql: string) => void` (or add a second optional callback) — on invoke, read `view.state.selection.main.head` and `view.state.doc.toString()`, compute the statement via `getStatementAtCursor`, and pass it to `onRun` | `web/src/components/kueri/SqlEditor.tsx` (lines 26, 75-82) | Compute inside the `runKeymap` handler so it always reflects live cursor position at run time, not stale React state. |
| 2 | Update `Workspace.tsx` `runQuery` to accept the resolved statement string (from the new `onRun` callback) instead of reading `draftSql` directly; keep a fallback to `draftSql.trim()` only if `SqlEditor` isn't mounted (unlikely) | `web/src/components/kueri/Workspace.tsx:116-173` | `runQuery` becomes `runQuery(statementSql: string)`; the "SQL is empty" validation now checks the resolved statement, not the whole buffer. |
| 3 | Verify `pushHistory`, `setLastQueryContext`, `lastQuerySql` (used later by `fetchWithFilters`/`loadMoreRows`) all use the resolved single statement, not the full buffer — so filtering/pagination on the result keeps working correctly | `web/src/components/kueri/Workspace.tsx:135-173, 175-260` | These already consume the `sql` passed into `runQuery`, so once step 2 is done this should follow automatically — just confirm no other code path still reads `draftSql` for execution. |
| 4 | Check any other caller of `SqlEditor`'s `onRun` (e.g. a toolbar "Run" button separate from the keymap) and update it to also resolve cursor-based statement, or explicitly document it runs "statement at last known cursor position" | `web/src/components/kueri/*` (grep for `onRun=` usages) | If a toolbar button exists outside the CodeMirror keymap, it needs the CodeMirror view ref to read cursor position too — may require lifting a `getCurrentStatement()` accessor off `SqlEditor` via `ref`/imperative handle instead of only a keymap-time computation. |

**Done when:**
- [ ] Placing the cursor in the first statement and pressing `Mod-Enter` (or clicking Run) executes only the first statement.
- [ ] Placing the cursor in the second statement executes only the second statement.
- [ ] Single-statement tabs behave exactly as before.
- [ ] Filtering and "load more" on results still work (they depend on `lastQuerySql` being the correct single statement).

### Phase 3: Backend guard (defense in depth)
**Goal:** Even if a multi-statement string reaches the API (bypassing the frontend fix, e.g. via direct API use or a future bug), the backend fails fast with a clear error instead of building invalid SQL.

| # | Task | Files / area | Notes |
|---|------|--------------|-------|
| 1 | In `Executor.Execute`, call the existing `HasMultipleStatements(sql)` (from `filter_eligibility.go:38-42`) early, before eligibility/pagination logic runs | `api/internal/modules/query/executor.go:31-38` | If true, return a new sentinel error, e.g. `ErrMultipleStatements`, with message like `"Only one SQL statement can be executed at a time"`. |
| 2 | Define `ErrMultipleStatements` alongside existing sentinel errors (`ErrConnectionNotFound`, `ErrInvalidFilter`) | wherever those are declared (likely `api/internal/modules/query/errors.go` or similar — confirm via grep) | Match existing error-wrapping conventions used for `ErrInvalidFilter`. |
| 3 | Map the new error to an appropriate HTTP status (400) with the clear message in the HTTP handler layer, consistent with how `ErrInvalidFilter`/`ErrConnectionNotFound` are already mapped | handler file for query execution (locate via grep for `ErrInvalidFilter` usage outside `executor.go`) | Confirm existing pattern before adding a new branch. |

**Done when:**
- [ ] Sending the exact two-statement repro directly to the execute endpoint (bypassing the frontend) returns a 400 with a clear "only one statement" message, not a driver syntax error.
- [ ] Single-statement requests are unaffected.

### Phase 4: Tests
**Goal:** Prevent regression on both sides.

| # | Task | Files / area | Notes |
|---|------|--------------|-------|
| 1 | Add TS unit tests for `getStatementAtCursor` covering: cursor in stmt 1, cursor in stmt 2, cursor on the boundary `;`, semicolon inside a string literal, single statement (no `;`), leading/trailing whitespace and blank lines between statements | `web/src/lib/sql-query.test.ts` | Mirror the Go test style already used for `HasMultipleStatements`/`AnalyzeQueryFilterEligibility`. |
| 2 | Add Go test(s) for the new `Execute` guard: multi-statement input returns `ErrMultipleStatements`; single statement with a trailing `;` still succeeds (regression check against existing `TestPrepareFilteredPaginatedSQL_TrailingSemicolon`) | `api/internal/modules/query/executor_test.go` (create if it doesn't exist) or alongside `filter_eligibility_test.go` | Check whether `Execute` is easily unit-testable given its DB dependency — if not, test the guard as a small extracted function instead of the full `Execute` method. |
| 3 | Manual verification: run the app, paste the exact repro from the bug screenshot into one tab, confirm cursor-based execution works for both statements, and confirm no regression for existing single-statement scripts (including ones with a trailing `;`) | manual, dev environment | This is a UI change — per project guidance, must be manually verified in the browser, not just unit-tested. |

**Done when:**
- [ ] All new tests pass; existing test suites (`sqlutil_test.go`, `filter_sql_test.go`, `filter_eligibility_test.go`, `sql-query.test.ts`) still pass unmodified.
- [ ] Manual repro from the bug report no longer errors, and executes the correct statement depending on cursor position.

## Dependencies & order
- Phase 1 before Phase 2 (Workspace/SqlEditor wiring needs the splitting function to exist).
- Phase 3 (backend guard) is independent of Phases 1-2 and can be done in parallel, but should land in the same change set since it's the safety net for the same bug.
- Phase 4 tests follow their respective phases as each lands, not all at the end.

## Risks
| Risk | Mitigation |
|------|------------|
| CodeMirror cursor offset vs. original string offset mismatch (e.g. if any transform changes doc content before `onRun` reads it) | Compute cursor offset and doc text from the same `view.state` snapshot at run time, not from React props/state that might be stale. |
| A toolbar "Run" button (if one exists outside the keymap) has no live cursor position at click time | Investigate in Phase 2 step 4; if found, expose an imperative `getCurrentStatement()` via a ref on `SqlEditor` rather than relying solely on keymap-time computation. |
| Backend guard message duplicated/inconsistent with frontend's own multi-statement handling, confusing users if they somehow still see it | Keep the backend message generic and only meant as a safety net; the frontend fix should mean users never see it in normal use. |
| Splitting logic diverges subtly between TS (`sql-query.ts`) and Go (`filter_eligibility.go`) `HasMultipleStatements`/masking logic, causing edge-case inconsistency | Not required to unify into one implementation for this fix (different languages), but keep test cases mirrored between `sql-query.test.ts` and Go tests so any divergence is caught. |

## Test plan
- [ ] Unit (TS): `getStatementAtCursor` edge cases per Phase 4 step 1.
- [ ] Unit (Go): new `ErrMultipleStatements` guard per Phase 4 step 2.
- [ ] Manual: exact bug repro (two statements, run with cursor in each), plus a few existing saved scripts with single statements and trailing semicolons, to confirm no regression.
- [ ] Regression: existing `sqlutil_test.go`, `filter_sql_test.go`, `filter_eligibility_test.go`, `sql-query.test.ts` suites pass unchanged.

## Open questions
- Does a separate toolbar "Run" button exist outside the CodeMirror `Mod-Enter` keymap? Needs a quick grep of `onRun=` usages before Phase 2 step 4 can be scoped precisely.
- Where exactly are `ErrConnectionNotFound`/`ErrInvalidFilter` declared and mapped to HTTP status — needs a quick look before Phase 3 to match conventions exactly.

## How to execute later
> Invoke **`ship-the-plan`** when ready to implement — that is the go-ahead (replaces typing "oke gaskan" or similar).
