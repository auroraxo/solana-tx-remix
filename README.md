# Transaction Remix

[![acceptance](https://github.com/auroraxo/solana-tx-remix/actions/workflows/acceptance.yml/badge.svg)](https://github.com/auroraxo/solana-tx-remix/actions/workflows/acceptance.yml)

One public transaction signature in, one editable, verifiable recipe out.

**Status:** early, run from source. No npm package, no dependencies — a recipe is a plain
TypeScript file you can read, edit and re-verify.

## Quick start

Requires **Node.js 24+**. There is nothing to install: every import is a `node:` builtin.

    git clone https://github.com/auroraxo/solana-tx-remix.git
    cd solana-tx-remix
    node src/verify-recipe.mjs out/remix-multi-4HZWSH28.ts

The last command re-fetches a real mainnet transaction and fails unless the recipe in
`out/` reproduces it byte for byte. Set `SOLANA_RPC` to use your own RPC endpoint instead
of the public `api.mainnet-beta.solana.com`.

    node src/remix-from-signature.mjs <signature> [--program <programId>] [--idl <dir>]
    node src/remix-multi.mjs <signature> [--multi-idl <dir>] [--gen-idl <dir>]
    node src/verify-recipe.mjs out/<recipe>.ts
    node src/make-negatives.mjs   # regenerate the negative controls from out/

The single-program emitter reads the Whirlpool interface from `idl/sememe-store/` in this
repo, so it needs no extra setup. It does need the `auroraxo/sememe` checkout on the
machine for the decoder itself (`SEMEME_DIR`, or a sibling `~/github_repos/sememe`); with
that absent it falls back to Codama-generated codecs via `--idl`/`IDL_GEN_DIR`.

No private key, no wallet, no signing is involved at any point.

## Continuous integration

`node ci/acceptance.mjs` is the whole verdict, and GitHub Actions runs it on every push
(`.github/workflows/acceptance.yml`). It asserts eight things, each of which can fail:

1. **Every shipped IDL in `idl/multi/` binds a program** — the loader reports any file it
   cannot use, rather than dropping it silently. This is the check that was missing when
   `bisonfi.json` bound nothing and a recipe that touched BisonFi printed `(unknown)` for
   it while every other assertion here reported PASS: each of them looks at recipes, and a
   recipe whose labels are `(unknown)` passes byte-identity by construction.
2. **`neg/` is reproducible from `out/`** — regenerating the controls must change nothing.
   If it does, a control on disk is a mutation of a recipe that is no longer there: it still
   fails, but it no longer proves what its declaration says it proves.
3. **Every recipe in `out/` reproduces its transaction** byte for byte against a fresh RPC
   fetch. A recipe that only fails because the Whirlpool codecs are absent (they are not
   vendored) is reported as `SKIP`, never as a pass — unless the stored on-chain IDL is
   reachable, in which case that recipe is verifiable and a `SKIP` means the migration
   stopped working.
4. **Every control fails for its own mutation** — the source recipe is run first and its
   failures become the baseline; a control must exceed it. A control that fails only for
   reasons its source already fails for proves nothing, and an unreachable RPC is reported
   as "no verdict" rather than mistaken for a pass.
5. **Two claims a recipe makes about its own transaction are re-derived from the chain**,
   inside `src/verify-recipe.mjs`, so both apply to `out/` and to `neg/` alike:
   - *Instruction names.* No recipe withholds a name the shipped IDL set has. The two
     controls `idl-name-withheld-top` and `idl-name-withheld-cpi` blank a label the table
     can fill, which before this rule was indistinguishable from a correct recipe.
   - *Message version.* `RECIPE_VERSION` is checked against the actual message fields.
     It was written by both emitters and read by nothing, and a v0 recipe shipped
     declaring `legacy`: the classifier keyed on `msg.version === 0`, a field
     `getTransaction` omits for all three versions, so it fell through to a test that
     called every v1 message and every v0-with-empty-lookup-array message `legacy`.
     `neg/wrong-version` is that mislabelling. The instruction bytes are identical
     whichever name is used, which is why byte-identity never saw it.
6. **A stored artifact that does not verify is reported, not silently dropped.** The
   verifier once found that the stored object did not re-hash to its receipt, declined to
   use it, and then passed on the strength of the other decoder alone — a green run over a
   tampered artifact, which is the exact failure mode this repository exists to catch. So
   the tampering is now performed deliberately: the script copies the intact store to a
   temp directory, edits one argument type so the object still parses as valid JSON with
   instructions (the parser would catch a malformed edit and prove nothing about the
   digest), and requires the flagship recipe to fail with "does not verify". Re-disabling
   the fix makes this check fail loudly; a machine with no intact store to tamper with
   reports `SKIP` rather than a finding.

7. **Every Anchor event self-CPI is named whenever an IDL in this tree declares the
   event.** An Anchor `emit_cpi!` payload is the constant `EVENT_IX_TAG`
   (`e445a52e51cb9a1d`, little-endian) followed by the EVENT's own 8-byte
   discriminator and then the borsh body — so it is not any instruction of the emitting
   program, and a resolver that only knows instruction discriminators answers
   `(unknown)` for it. That is not a cosmetic gap: the same stored IDL file already in
   this tree declares `SwapEvent` and `SwapsEvent` under exactly those bytes, and the
   shipped recipes printed `(unknown)` for them while every other assertion reported
   PASS, because a name nobody can check is indistinguishable from a correct name.
   The check builds its event table by reading the IDL JSON files **directly** — the
   discriminator at bytes `8..16`, never bytes `0..8` — so it is a witness independent
   of the resolver under test, and it fails in both directions: an event the tree can name
   but the recipe calls `(unknown)`, and a label for an event no IDL declares. Four
   controls hold it in place: `neg/event-name-withheld` and `neg/event-name-withheld-cpam`
   and `neg/event-name-withheld-pump` (the label deleted) and `neg/event-name-wrong`
   (the label replaced with an instruction name). The wire
   constant is cross-checked against sememe's own codec export, because the same
   off-by-eight lookup mistake once shipped inside sememe's vendored-drift tool and
   reported zero events on a payload set that was more than half events.

8. **The recipe's editable constants ARE the bytes above them.** The README calls this
   file "editable", and every emitter writes `export const IX<n>_<INSTRUCTION>_<FIELD>`
   lines. Until 31.10. nothing compared them with the wire bytes: byte-identity compares
   `INSTRUCTION_BYTES` with the chain, which editing a constant does not touch — so a
   reader who changed an amount (the whole point of the file) got a recipe that still
   verified green and rebuilt to something else. The verifier now re-encodes the recipe's
   own constants through the program's own stored interface and requires byte equality
   with `INSTRUCTION_BYTES`. It fails in all four directions: a changed value, a constant
   renamed to a field the interface does not declare, a partial constant set (which cannot
   rebuild its payload), and constants for an instruction the recipe no longer carries.
   Two controls hold it in place: `neg/param-value-flip` (slippage 400 -> 401, bytes
   untouched) and `neg/param-field-renamed` (a constant that answers to nothing).

   The constants are also now emitted PER PROGRAM rather than looked up by name: the
   multi-program emitter used to look a schema up in the Whirlpool generated directory by
   instruction NAME, so every multi recipe in `out/` carried **zero** argument constants
   (`shared_accounts_route_v2` is in no generated file) — three of four shipped recipes
   were not editable at all. Arguments now come from the program that owns the
   instruction, from its own fingerprint-verified on-chain IDL, and are withheld unless
   they re-encode to the exact bytes they sit above.

The same script runs in CI and by hand, so a green badge and a local run are the same
claim. The `no control may go unjudged` step fails the build if the control table and the
`neg/` directory ever disagree, so a control cannot quietly go untested.

`node ci/v1-share.mjs` is a separate, slower measurement — it samples 24 blocks spread
over roughly 32 minutes and prints how much of mainnet is version 1 (SIMD-0385). It is
not part of acceptance and it never gates: the share moves with the chain, so a gate on
it would be a gate on the weather. It ships because the number quoted below is a claim
and its measurement path should be runnable by whoever doubts it, not just by whoever
made it. Two independent version sources are counted side by side — the RPC's `version`
key and the `0x81` byte in the transaction itself — and the script prints their
disagreements rather than only the number they happen to agree on.

`remix-from-signature.mjs` targets one program (Whirlpool) and names its fields from the
program's own on-chain IDL, pulled by `auroraxo/sememe` and stored in `idl/sememe-store/`
in this repo. It runs on a fresh clone with no extra setup — the emitted recipe says which
source it used in its header. If that store is absent (a clone without the checkout, or a
machine without `SEMEME_DIR`), it falls back to Codama-generated codecs via `--idl <dir>`
or `IDL_GEN_DIR`, and if neither source exists it exits with a message naming both rather
than failing mid-run. A store that is present but does **not** verify is a hard stop, not
a fallback: see "What the stored IDL changes" below. `remix-multi.mjs` is the common
Solana case — an
aggregator reaching a swap through several programs — and dispatches each instruction
(top-level and CPI) against the directory of per-program IDLs **shipped in `idl/multi/`**
in this repo, so it works on a fresh clone with no extra setup.

## What the recipe contains

- every instruction's encoded bytes (base64), byte-identical to the chain
- every **inner (CPI) instruction**'s bytes, keyed `[parent][slot]` — in an aggregator
  transaction the instruction that matters is usually a CPI, and a recipe without them is
  a summary of the transaction rather than the transaction
- instruction names resolved from the program's own generated IDL codecs
- argument fields decoded into named constants (`IX6_SWAP_V2_AMOUNT = 1n`), from the
  program that owns the instruction, and only written when they re-encode to the
  exact bytes of the instruction they sit above
- account roles named from the IDL (`WHIRLPOOL`, `TICKARRAY0`, `TOKENVAULTA`)
- the flat address space: static keys plus lookup-table entries, in runtime order

## The acceptance criterion

A recipe is only useful if it *is* the transaction. `verify-recipe.mjs` re-fetches the
transaction from an RPC and fails unless:

1. instruction count matches,
2. every program address matches,
3. every account index list matches,
4. every instruction byte matches,
5. every account index resolves to a real address inside the declared address space,
6. every lookup-table entry matches what the runtime actually loaded,
7. every **inner (CPI)** instruction's program, account list and bytes match
   `meta.innerInstructions`.

The format the emitters write and the verifier reads is defined once (`renderInnerBytes` /
`parseInnerBytes` in `src/remix.mjs`). It was previously defined twice, in two files: the
verifier demanded a block no emitter produced, so all three positive controls failed with
cpi mismatches against instructions the recipes never claimed to hold. A check and the
artifact it checks must not drift independently — that failure mode is invisible in the
check itself, which reports it as a defect in the recipe.

### Negative controls

`neg/` is generated from `out/` by `src/make-negatives.mjs`, so each control differs from a
passing recipe in exactly one declared way. Controls that fail for an unrelated reason are
evidence of nothing; the earlier hand-copied set did exactly that (they failed on a missing
`ADDRESS_SPACE_SIZE`, not on their mutation).

| control | mutation | expected failure |
|---|---|---|
| `arg-flip` | one instruction byte flipped | byte mismatch (1) |
| `dropped` | last instruction removed | instruction count (1) |
| `no-lut` | lookup-table contents stripped | unresolvable account index (83) + LUT ground truth (1) |
| `wrong-sig` | recipe re-labelled as another signature | instructions absent on chain (13) + address space (1) |
| `multi-arg-flip` | same flip on a multi-program recipe | byte mismatch (1) |
| `inner-flip` | one CPI byte flipped | cpi byte mismatch (1) |
| `inner-dropped` | one CPI removed | cpi present in chain, missing from recipe (1) |
| `native-name-swap` | two real native names swapped (bytes untouched) | bytes decode as a different instruction (2) |
| `native-name-crossprogram` | ComputeBudget label placed on the System instruction | bytes decode as a different instruction (1) |
| `idl-name-swap2` | dflow `swap2` relabelled `swap` (bytes untouched) | named instruction has no codec (1) |
| `idl-name-cpi` | one CPI relabelled `transferChecked` (bytes are `transfer`) | named inner has no codec (1) |
| `single-cpi-name` | same relabel on a **single-program** recipe, where CPIs were unlabelled | bytes resolve to `transferChecked`, recipe claims `transfer` (1) |

All twelve fail. Nine fail with exactly one reported failure, attributable to the
mutation alone. The other three carry larger counts for specific reasons:
`native-name-swap` reports 2 — the swap wrong-labels both instructions it touches, which
is one declared mutation with two affected rows; `no-lut` reports 84 (83 unresolved
indexes — every index past the static keys, once the table contents are gone — plus the
LUT ground-truth check that can now see the gap); `wrong-sig` reports 14 (instruction
count, one mismatch per instruction against a transaction with a different shape, and
the declared address space). The last two rows of that count only became reachable
after the early-exit fix described above: criteria 6 and 7 used to be skipped whenever a
top-level check had already failed, so a control whose mutation is in the LUT or a CPI
reported nothing about it. The `single-cpi-name` control exists for the same reason one
level over: as long as the single-program emitter wrote every CPI as `(unknown)`, a false
CPI label on that recipe was untestable — the verifier's label branch was gated on
`isMultiProgram`, so it skipped the entry point entirely. Checked against the released
code, the old verifier **passes** this control and the current one fails it with exactly
one attributable failure. **All five** recipes in `out/` now pass on a fresh clone. The
fourth (`out/remix-6754RLWd.ts`, single-program Whirlpool) used to need the Whirlpool codec
directory supplied via `--idl` or `IDL_GEN_DIR`, and was reported `SKIP` without it; its
arguments are now decoded from the vendored, fingerprint-verified on-chain IDL (see
"What the stored IDL changes" below).

The `native-name-*` controls exist because byte identity cannot see a wrong name: in
both, every byte matches the chain, and only the label is false. Until native decoding was
added to the verifier, each passed. The `idl-name-*` controls are the same defect shape
one level up — relabel a multi-program instruction as another of the same program's
instructions, or relabel a CPI's name: bytes are intact, only the label is false. Until
`dispatch.mjs` was shared between emitter and verifier (so the verifier re-resolves the
label through the same IDL tables), each passed.

## How this compares to `@solana/transaction-introspection@8.5.0`

Measured on the same signature (`6754RLWd…YT6`, v0, 10 outer + 14 inner instructions),
not guessed. The fetch/decode layer is commodity and this tool should not pretend
otherwise; the table says where the boundary actually is.

| | `transaction-introspection@8.5.0` + kit clients | this repository |
|---|---|---|
| program / bytes / account lists agree | 24/24, 24/24, 24/24 | 24/24, 24/24, 24/24 |
| wire bytes re-encodable | yes — recomposes the 793-byte RPC transaction exactly | n/a (it verifies, it does not rebuild) |
| resolved accounts incl. lookup tables | yes | yes |
| instructions named, kit clients only | 17/24 — all 7 Whirlpool instructions stay **unnamed**, because `@solana-program/whirlpool` does not exist on npm | 24/24, zero dependencies |
| instructions named, Orca's own client added | 24/24 (needs `@orca-so/whirlpools-client`) | 24/24 |
| editable artifact | no — returns an in-memory object | yes — a plain TypeScript file |
| acceptance check + negative controls | no | 8 checks, 25 generated controls |

So: adopt the commodity layer for what it does (decoding, wire round-trip, native and SPL
naming where a kit client exists), and keep the rest. Naming the **target** program is the
line — Whirlpool has no auto-generated kit client, and a hand-maintained third-party
client is a dependency the Quick-Start deliberately does not have. This repository names
all 24 instructions of its flagship example from shipped IDL tables with no `npm install`.

The same 24/24 byte agreement is also cross-validation: two implementations that never
share a line of code produce identical instruction bytes, account lists and loaded
addresses for this transaction. If either side is wrong, one of them is wrong in the
other's presence.

## What a consumer's stack does with a v1 message (measured)

A v1 recipe is only useful to a project whose libraries can read v1. So that was measured
instead of assumed: 9674 mainnet transactions from 24 blocks (slots 459702377–459711577,
2026-10-21 16:48–17:21Z), every transaction fed to the real parsers of seven published
versions of two stacks, 400 per version class each.

**How much is at stake.** Of those 9674 transactions, 4552 (47.1%) are v1 — 38.7% of the
6277 that succeeded on chain. A second run of `ci/v1-share.mjs` about forty minutes later,
on 8874 transactions, put it at 44.2% of all and 36.4% of successful. A run the next day
(22.10, 9311 transactions over 24 blocks) read 38.8% of all and 30.8% of successful — so
the range itself is the honest figure, because the share moves with the chain, and every
number here is dated to the day it was measured rather than offered as a standing
property of the network. The two version sources agreed on all 9674 transactions (0
disagreements), so the denominator is not an artifact of one RPC field.

**The results, one row per published version:**

| stack version | legacy wire | v0 wire | v1 wire | v1 re-serializable |
|---|---|---|---|---|
| `@solana/web3.js` 1.70.0 | 400/400 | 400/400 | **0/400** | no |
| `@solana/web3.js` 1.91.0 | 400/400 | 400/400 | **0/400** | no |
| `@solana/web3.js` 1.95.0 | 400/400 | 400/400 | **0/400** | no |
| `@solana/web3.js` 1.98.4 | 400/400 | 400/400 | **0/400** | no |
| `@solana/web3.js` 1.99.0 | 400/400 | 400/400 | 400/400 | **no — 0/150** |
| `@solana/web3.js` 3.1.1 (latest) | 400/400 | 400/400 | 400/400 | yes — 300/300 byte-identical |
| `@solana/kit` 8.5.0 | 400/400 | 400/400 | 400/400 | yes — 150/150 byte-identical |

Read via `VersionedTransaction.deserialize()` (web3.js) and
`getTransactionDecoder().decode()` (kit). The legacy `Transaction.from()` API fails on
v0 and v1 alike in every version — that is its documented contract, not a defect; it is
the versioned entry point that has to carry v1.

**What the failures actually say.** Under 1.70.0 and 1.91.0 a v1 wire fails with
`Expected signatures length to be equal to the number of required signatures` — it read
the `0x81` version prefix as a shortvec signature count. Under 1.95.0 and 1.98.4 the same
bytes fail with `Reached end of buffer unexpectedly`. Neither message contains the word
*version* or the number *1*, so a caller catching them sees a malformed transaction where
the chain saw an ordinary one. Under 1.99.0 the read succeeds and the write fails:
`Serialization of version 1 transaction messages is not supported`, on 150 of 150
samples. That version split the work — reading v1 landed on 2026-09-08, writing it did
not, and the maintainers say it will not: solana-foundation/solana-web3.js#3908 was
closed `not_planned` a week after 1.99.0 came out, with "We are not planning to add
new features to v1.x — it's in maintenance only mode." So a `^1.70.3` range (which is
what `@sqds/multisig@2.1.4` declares) resolves to a 1.99.0 that can display a v1
transaction but not rebuild it, and anything older cannot show it at all.

**Why v1 is not merely "a newer version":** the signature block moved to the end of the
wire. A v0 shortvec signature count can never equal `0x81` — that bit means *continue*, so
a leading `0x81` reads as at least 129 signatures, more than a whole transaction holds —
which is exactly why pre-v1 parsers read the prefix as a count instead of as a version,
and why the confusion is structural rather than a bug anyone can patch in isolation.

**Two controls, because a table that fails everything is as worthless as one that passes
everything:** legacy wire parses on all seven versions, and v0 wire parses on all seven.
So each 0/400 above is specifically about v1. A second control on the corpus itself: byte 0
being `0x81` predicted the RPC's `version: 1` on all 9674 transactions.

Two limitations, stated rather than buried: each cell is 400 sampled transactions, not
every transaction in every block; and web3.js 1.99.0 was tested for reading and writing
but not for the full `sendAndConfirm` path, which was out of scope. `kit` 8.5.0 decodes
v1 compiled messages into a different object shape than legacy and v0
(`instructionHeaders`/`instructionPayloads` instead of `instructions`), so code that
reaches for `message.instructions` reads `undefined` on a v1 message and fails later,
away from the parse itself.

## Known limits (measured, not guessed)

- Instruction names and argument layouts come from a supplied IDL directory, plus a pinned
  table for the native Solana programs (`src/native.mjs`). The single-program Whirlpool
  path now prefers the vendored stored on-chain IDL and needs no directory at all; the
  generated codecs remain as the documented fallback when that store is absent. Without a
  source, bytes still
  round-trip but names stay `null` — the tool reports `0/N decoded` rather than inventing
  labels. On `3yB9Q1pq…` the multi-program path names 9 of 10: 4 top-level (ComputeBudget
  `SetComputeUnitLimit`, `SetComputeUnitPrice`, `RequestHeapFrame`, System `Transfer`) and
  all 5 CPI. The one unnamed instruction is Titan (`T1TANpTe…`), an aggregator with no
  published IDL — deliberately left as `(unknown)` rather than guessed from byte position.
  The single-program path names 10 of 10 top-level and 14 of 14 CPI on `6754RLWd…` — it
  used to name 10 of 24, leaving every Token CPI `(unknown)`, because it resolved names
  through `decodeNative` alone (ComputeBudget and System) instead of the dispatch table
  the multi-program emitter writes from. Both entry points now resolve through
  `dispatch.mjs`, so a label means the same thing in either.
- An `(unknown)` label used to be unverifiable by construction: every name check was
  reached through `if (name)`, so withholding a name skipped all of them, and byte-identity
  does not care. `out/remix-3yB9Q1pq.ts` shipped five CPIs in exactly that state — nameable
  from the shipped tables, never regenerated after the emitter was fixed — and acceptance
  passed. The verifier now fails when the shipped IDL set can name bytes the recipe
  withheld, at top level and for CPI alike; `neg/idl-name-withheld-*.ts` are the two
  controls that prove the check exists. A null resolver result stays unflagged, because
  "no IDL covers this program" is a real state (Titan, and the one DFlow instruction its
  17-entry table does not declare) and must not be reported as a defect.
- Native programs do not share a selector width: ComputeBudget writes a one-byte
  discriminator (`data[0]`), System uses a four-byte u32 LE bincode tag. Reading either
  with the other's width fails silently — it never errors, it just names nothing. The two
  enums in `src/native.mjs` are pinned to `anza-xyz/solana-sdk@8db406e` and each is
  corroborated by a second independent source, recorded alongside the pin.
- The message version is decided from field presence, not from `msg.version`:
  `getTransaction` omits that key for legacy, v0 and v1 alike (measured on 1730 mainnet
  transactions, present for 0 of them), so a rule keyed on it never fired. `transactionConfig`
  means v1, a present `addressTableLookups` key means v0, neither means legacy. Presence,
  not length: a v0 message whose lookup array is *empty* is still v0, and 467 of 813 sampled
  v0 messages are exactly that. v1 is 37–47% of mainnet when measured: `node ci/v1-share.mjs`
  read 47.1% of all transactions and 38.7% of successful ones on 21.10 (second run half an
  hour later: 44.2% and 36.4%), then three runs on 22.10 read 37.6–39.8% of all (24-block
  run: 38.8% of all, 30.8% of successful) — the share moves with the chain, so these are
  dated runs, not a constant. A single-program recipe of it now verifies byte for
  byte, which it did not before, because it was being called legacy. The stacks those
  recipes must land in are measured in the section above.
- The generated `buildRemixedTransaction()` helper takes its version from `@solana/kit`, not
  from this tool's label: Kit's `TransactionVersion` is `'legacy' | 0`, so the emitter used to
  write `version: "v0"`, which does not typecheck. Nothing here compiles the generated code
  and Kit's runtime does not validate the value, so the error only reached a reader pasting
  a recipe into a real project. A v1 message has no Kit 5 equivalent, so a v1 recipe omits the
  helper and states why, rather than downgrading to a message the verifier never checked.
- Per-program IDLs declare their program address in different places: the shank-origin
  ones (`aquifer`, `bisonfi`, `solfi`, `spl_token_2022`) put it in `metadata.address`, the
  rest at the top level. `parseIdlJson` reads both. It did not until 21.10, and
  `bisonfi.json` was the cost: it declared three instructions with explicit discriminants,
  bound zero programs, and every BisonFi instruction in `out/` rendered `(unknown)` while
  `node ci/acceptance.mjs` printed PASS — no check asked whether a shipped IDL was
  reachable. `PROGRAM_NAME_ALIASES` then supplies the addresses no file carries (classic
  SPL Token, which Token-2022's `metadata.address` cannot name), each a verified executable
  mainnet program; a wrong binding mislabels bytes silently, which is the failure mode the
  tool exists to catch elsewhere. Reachability is now asserted: step 1 of acceptance fails
  on any shipped IDL that binds nothing.
- Account roles come from the IDL's account order. Where an IDL's order differs from the
  program's real one, labels are wrong even though the bytes are right.
- `remainingAccountsInfo` is reported as raw base64 rather than decoded — except in the
  single-program Whirlpool path, where the stored on-chain IDL decodes it (as
  `{"__option":"None"}` or the full slice list), and the generated path is the one that
  refuses it.
- Compile fees, prioritization fees and blockhash are captured, not remixed.
- Inner (CPI) instructions are recorded for verification only. Rebuilding the message must
  not append them — they are the parent program's effects, not parts of the signed message.

## Data provenance

- **`idl/multi/*.json`** — instruction IDLs for the programs the recipes in `out/` call
  (Jupiter, DFlow, BisonFi, Token-2022, Aquifer, Solfi, …). These describe deployed
  mainnet programs; the loader in `src/idl-bitquery.mjs` follows the shape shipped by
  `bitquery/solana-idl-lib`.
- **`out/*.ts`, `out/*.json`** — generated from public mainnet RPC. Everything in them is
  already public chain data: real signatures, real program addresses, real instruction
  bytes.
- **`neg/*.ts`** — generated from `out/` by `src/make-negatives.mjs`; mutated copies of the
  passing recipes, not independent transactions.
- **`idl/sememe-store/`** — a content-addressed IDL store: the Whirlpool program's own
  on-chain IDL plus a receipt recording program, source account, slot and fingerprint.
  Produced by [`auroraxo/sememe`](https://github.com/auroraxo/sememe), which pulls it from
  the chain and stores it by SHA-256 of its canonical JSON.

No Whirlpool-generated codecs are vendored here. The Orca repository relicensed in
February 2025, so those remain an optional cross-check you point `IDL_GEN_DIR` at rather
than something to ship. The stored on-chain IDL is a different thing and IS vendored: it
is the deployed program's own interface, pulled from the chain, and it is re-verified
against its own bytes before every use.

## What the stored IDL changes

`src/sememe-idl.mjs` decodes single-program Whirlpool arguments from the stored on-chain
IDL instead of from generated codecs, and `src/sememe-idl-source.mjs` gives the EMITTER
the same source. Four things follow, and all four are measured rather than asserted:

- **The flagship recipe verifies on a fresh clone.** `out/remix-6754RLWd.ts` was `SKIP` in
  CI for want of the Orca codecs; it now passes, with 7 Whirlpool instructions decoded and
  14 CPIs verified.
- **The tool can produce one too, not just check one.** The emitter used to exit with
  "Whirlpool codec directory not found" on a fresh clone, before naming a single
  argument. It now runs on the stored IDL alone. Re-emitting the flagship changed the
  description, not the transaction: `ACCOUNTS`, `LOOKUP_TABLE_ADDRESSES`,
  `INSTRUCTION_BYTES` and `INNER_BYTES` are byte-identical to the previous recipe, and
  the `.json` is unchanged.
- **The names are the program's own.** The stored IDL carries all 57 discriminators the
  generated directory carries, with identical names, and **9 it does not have at all**
  (`close_position_with_token_extensions`, `initialize_position_bundle_with_metadata`,
  `set_reward_authority_by_super_authority`, …) — instructions the old path could not
  name even with the codecs on disk. Argument and account-role names come from the
  program: `IX6_SWAP_V2_SQRT_PRICE_LIMIT` instead of `IX6_SWAP_V2_SQRTPRICELIMIT`, and
  `remaining_accounts_info` reads `{"__option":"None"}` instead of the raw
  `{"__optionRemaining":"AA=="}` the generated path declined to interpret.
- **The bytes name themselves.** The old verifier looked the argument layout up *by* the
  recipe's label, so a false label found a false layout and decoded it. The stored IDL is
  keyed the other way: the discriminator names its own instruction, and the name must
  match the label. The `idl-name-top-whirlpool` control measures this — relabel
  `SWAP_V2` as `SWAP`, bytes untouched:
  - old verifier: `PASS` — "decoded 10/10 with generated IDL codecs"
  - current verifier: `FAIL` — "ix 6: stored IDL names these bytes swap_v2, recipe claims SWAP"
- **Two independent decoders cross-check each other.** When the generated codecs are also
  present, every Whirlpool instruction is decoded twice and the values compared: 7
  instructions, 24 fields, 17 exact agreements, 7 fields the generated path refuses
  (`option`/`defined` args), **0 disagreements**. The two sides come from different code
  and different provenance for the layout, so agreement is evidence rather than a
  tautology.

The artifact is verified, not trusted: `sha256(canonicalJson(idl) + '\n')` must equal the
receipt's fingerprint, re-checked before every decode. A store that is present and does
not verify is a **failure**, not a fallback — a tampered artifact is caught and reported
rather than skipped over, because "the check found the damage and the run went green
anyway" is the exact failure mode this repository exists to catch. The emitter keeps the
same distinction: an absent store falls back to the generated codecs (or exits naming
both sources when neither exists), while a store that is present and damaged exits 2
rather than quietly becoming another source's names.

The decoder itself comes from the `auroraxo/sememe` checkout (`SEMEME_DIR`, or a sibling
`~/github_repos/sememe`). It is imported directly, not vendored, so the two sides cannot
drift apart; its decode core has **no npm dependencies**, which is what makes that
possible in a repository with no `package.json` and no `node_modules`. Where neither
decoder is reachable, the recipe reports `SKIP` as before — an unverifiable claim, never a
pass.

## What the stored IDL changes for MULTI-program recipes

The first migration moved ONE program — Whirlpool — off its generated codecs. The
multi-program path kept reading the IDL copies checked into `idl/multi/`, which is the
thing a content-addressed store exists to replace: snapshots with no provenance, no
fingerprint and no freshness check. Those copies are now measured rather than assumed.

**The measurement** (sememe's `tools/vendored-drift.mjs`, against the on-chain artifacts
pulled on 2026-10-30; report:
`auroraxo/sememe@research/vendored-drift-tx-remix-2026-10-30.json`):

| vendored copy | instructions | on-chain | missing from the vendored copy |
|---|---|---|---|
| `idl/multi/jupiter-amm/amm.json` | 17 | 19 | `create_idempotent_associated_token_account`, `withdraw_token_account_excess_lamports` |
| `idl/multi/dflow/dflow.json` | 17 | 18 | `withdraw_fees` |
| `idl/multi/jupiter-order_engine/order_engine.json` | 1 | 1 | — |
| `idl/multi/jupiter-rfq_v2/rfq_v2.json` | 1 | 1 | — |
| `idl/multi/aquifer`, `bisonfi`, `solfi`, `spl/token-2022` | 2 / 3 / 1 / 44 | — | no on-chain Anchor IDL exists for these programs |

Every vendored copy that HAS an on-chain IDL is strictly stale. Four of the eight
programs publish no on-chain Anchor IDL at all — they are native or shank-origin programs
whose only description is the checked-in file — so for those the vendored copy is still
the right source, and it is kept.

**The defect that was real traffic.** `create_idempotent_associated_token_account` is
missing from the vendored Jupiter copy and appears in **real mainnet traffic**. The
recipe emitted from the vendored copy printed `(unknown)` for it, and `(unknown)` is the
one state every label check deliberately skips — so the transaction was described
half-way and nothing complained. The shipped recipe
`out/remix-multi-2Wti3kFM.ts` (signature `2Wti3kFMoFxTPX7WMBxJqYBEBdPuwi4gkhPEtUnwq1BRhQUoFzNAUNFDA4BacdFLsDct3dugWQ7EiiwdxDqKGKen`)
names it, and the emitter's count went from 12/15 to 13/15 with the transaction bytes
unchanged.

**What changed in the code.** `src/sememe-multi.mjs` loads every stored artifact in the
store as a per-program instruction table; `buildStoredResolver` in `src/dispatch.mjs`
layers those tables over the vendored copies, and both the emitter
(`src/remix-multi.mjs`) and the verifier (`src/verify-recipe.mjs`) resolve labels
through it. The overlay is additive per program: the vendored copy still describes the
programs with no on-chain IDL, and the stored copy fills in the rest.

**Two things the migration does not paper over:**

- A **stored** discriminator always wins over a **derived** one, and the disagreement is
  reported rather than resolved silently. Jupiter AMM v6 stores `5368c096` for
  `create_idempotent_associated_token_account` where Anchor's rule derives `bdbcecfa`;
  five real payloads carry `5368c096` and re-encode byte-exactly, so the stored value is
  the one that survives contact with the chain.
- The multi-program store loader **re-hashes the object against its receipt**, like the
  single-program one. It did not at first, and the acceptance harness caught the
  difference: a tampered Jupiter object — valid JSON, one instruction renamed — was
  ACCEPTED by the multi path while the single path refused the identical damage. One
  store with two readers must verify with one strength. Both paths are now checked by
  `ci/acceptance.mjs`.

**Falsification.** `neg/idl-name-stored-only.ts` relabels the newly-named instruction
to a name the stale vendored copy carries. The verifier answers:
`ix 0: bytes resolve to create_idempotent_associated_token_account on JUP6…TaV4, recipe
claims create_token_account` — exit 1. A verifier that fell back to the vendored copy
could not resolve either label and would pass.

## Two more programs: the "no IDL" claim was wrong

On 2026-10-30 the shipped recipe `out/remix-2Apc8uSC.ts` carried three CPI labels that
read `(unknown)` — the one state every label check deliberately skips, so nothing
complained. Two of them were on programs this repository had assumed published no
on-chain IDL at all: **cp-amm** (`cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`,
Meteora DAMM v2) and **pump.fun** (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`).

**The assumption was false, and one pull falsified it.** Both programs publish an
on-chain Anchor IDL; both artifacts are now in `idl/sememe-store/` with receipts:

| program | on-chain source | slot | instructions | events |
|---|---|---|---|---|
| cp-amm | `anchor:idl` @ `F1hSvutXSc9iAvB9bQPmjNDwiN2tCXzazTEEvDgNCBMa` | 463372654 | 38 | 23 |
| pump.fun | `anchor:idl` @ `AYgC53tU5BbP2NAnv5nConJxAdpQZctvmZK88pu69xRs` | 463372656 | 47 | 28 |

Both IDLs **store** every discriminator (38/38 and 47/47 instructions, 23/23 and 28/28
events), and every stored value equals Anchor's derivation rule byte for byte — so no
derivation was needed and no gap had to be filled in.

**What the three labels became.** Re-emitting the recipe from the same public signature
changed exactly three labels and nothing else — `INSTRUCTION_BYTES`, `INNER_BYTES`,
`ACCOUNTS` and the transaction bytes are byte-identical:

- cpi `[4][3]` on cp-amm: `(unknown)` → `swap`
- cpi `[4][6]` on cp-amm: `(unknown)` → `event:EvtSwap2`
- cpi `[4][27]` on pump.fun: `(unknown)` → `event:TradeEvent`

**The falsification that drove it.** Before the artifacts existed, acceptance check 6
was *green* about these payloads precisely because it could not name them — it counted
them as "honestly (unknown), no IDL in this tree declares them". The moment the two
artifacts landed, the same check went red with three findings, which is the check
working: the tree can now name them, so it must. The summary line was also corrected —
it used to count a payload as "named" from the declaration alone, so it printed "5 named"
while three findings sat directly above it; it now counts only payloads where the
resolver and the recipe both agree.

**What this says about the product.** `sememe`'s premise is that a program either
publishes an interface or does not, and that the interface can be pulled once and then
used offline. This is the first case where the *absence* of an interface was the
assumption and the pull killed it: two of the three unnameable payloads on a real
mainnet transaction were nameable all along. The honest limit is that the opposite may
also be true — a program may publish an IDL that describes fewer instructions than its
traffic uses, and a pull alone does not prove coverage of the traffic.

## License

MIT — see `LICENSE`. The programs named in the recipes and IDLs are third-party code;
this repository does not claim them.
