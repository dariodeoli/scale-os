# Independent action audit — #330, #331, #335

Audited integration `7f4a690f` against published baseline `4530281e`. Field-order-only recheck at `8c0ace1e` moves the intact AccountForm RUC lookup before institution; JSX/callbacks and action counts remain unchanged, and the current source hashes are refreshed.
Result: **634 canonical actions, 53 reviewed structural widgets, 1 renderer, zero unreviewed sites**.

Reviewed callbacks and surrounding guards directly in source:

- Three changed actions: approval/rejection use canonical assignable-role policy; AccountForm submit adds explicit submit type and handles edit revision/UUID.
- Eight new actions: compact appearance disclosure; intake open/revoke/review; monthly review/receive/pagination; account edit.
- Two removed remote search actions retain search and clearing in the client dropdown's shared SearchField, including clearing on close.
- One existing native permission toggle adds canonical hierarchy gating. Exact before/after JSX and hashes are archived; its original widget owner and native anatomy remain.
- Two AccountForm native choice templates move to shared SelectCustom, preserving values and dirty callbacks. The identical InvoiceForm currency template remains, so retirement matching includes the component owner.

The migration engine, original migration review and original applied inventory remain byte-identical to the baseline. Historical #325 evidence remains present; #330 evidence is appended. The test invariant accepts only an exact reviewed chain anchored to immutable widget history and rejects tampered JSX, hashes, owners, unapproved records and missing history. No new structural exemption is added.

Reproduce from repository root (use a clean checkout to avoid concurrent source edits):

```bash
node docs/qa/mcp330/action-audit/refresh-actions.mjs \
  --baseline=4530281e \
  --native-reviews=docs/qa/mcp330/action-audit/native-reviews.json \
  --native-retirements=docs/qa/mcp330/action-audit/native-retirements.json \
  --reviews=docs/qa/mcp330/action-audit/canonical-reviews.json \
  --retirements=docs/qa/mcp330/action-audit/canonical-retirements.json \
  --out=/tmp/scale330-action-audit
node --test tests/migrate-ui-actions.test.mjs
node build-tools/check-ui-action-ownership.mjs
```

The refresh helper only writes the three current audit JSON files when `--write` is explicitly supplied. This audit does not prove production deployment, provider credentials, physical devices or real money workflows.

Final treasury notice recheck at `1e02a624` (UI change `a9c7bdd2`) restores the existing privacy purpose text and ordinary privacy link before AccountForm SaveActions. This changes only source metadata in the action audit: Button/widget JSX, callbacks, categories and counts remain unchanged.
