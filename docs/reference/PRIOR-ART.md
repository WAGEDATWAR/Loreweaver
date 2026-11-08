# Prior art

What the sibling projects proved, what Loreweaver refuses, and why. Reference only; no authority over
the root docs.

---

## Chub Transformation Helper

Proved that a **manual override always wins** and that generated data should pass a review step before
it becomes canon. Loreweaver takes the override principle for import: nothing replaces the project
without a preview and a pre-import backup.

## Synthesis

Proved a **topic-owned document set**, decision and deferral ledgers, and a gate discipline where a
regression blocks the next phase. Loreweaver takes the doc shape (`DOCUMENTATION-INDEX.md`,
`DECISIONS.md`, `DEFERRALS.md`, one owner per topic) and the rule that a deferral without a row is a
bug.

## Storyloom

Proved that **structure beats prose state**. Its fact ledger is the same instinct one level up: an entry
is a record, not a blob. Loreweaver takes the schema-as-hub stance and the adapter-at-the-rim split.

---

## Refused

- **A build step.** Native modules only; no bundler, no transpiler.
- **Runtime dependencies.** Pixi, React or a DOM helper would each be one more thing to audit.
- **Emulating activation at runtime.** The editor captures settings; the frontend applies them.
- **A cloud account.** Files in, files out.
- **Forking a frontend.** This is a companion tool, not a client.

---

## What the parity audit measures

`docs/reference/PARITY.md` records SillyTavern and Chub field coverage. A field is either editable,
preserved-and-not-editable, or absent-with-a-warning. Absent-with-a-warning without a warning test is the
bug the audit exists to catch.
